import type { RealtimeChannel } from "@supabase/supabase-js";
import { type MeetingSignal, onMeetingSignal } from "./meeting-realtime";

export type WebRtcSessionOptions = {
  channel: RealtimeChannel;
  peerId: string;
  iceServers?: RTCIceServer[];
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onPeerLeft?: (peerId: string) => void;
  onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
  onScreenShareChange?: (peerId: string, enabled: boolean) => void;
};

export class WebRtcSession {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private readonly streams = new Map<string, MediaStream>();
  private readonly options: WebRtcSessionOptions;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private reconnecting = new Set<string>();
  private unsubscribeSignal: (() => void) | null = null;

  constructor(options: WebRtcSessionOptions) {
    this.options = options;
    onMeetingSignal(options.channel, (signal) => {
      void this.handleSignal(signal);
    });
  }

  async startLocalMedia(constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  getLocalStream(): MediaStream | null { return this.localStream; }
  getScreenStream(): MediaStream | null { return this.screenStream; }

  async connectToPeer(peerId: string, initiator = true): Promise<void> {
    const peer = this.createPeer(peerId);
    if (!initiator) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await this.send({ type: "offer", peerId: this.options.peerId, targetPeerId: peerId, sdp: offer });
  }

  setAudioEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
  }

  setVideoEnabled(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
  }

  async startScreenShare(): Promise<void> {
    if (this.screenStream) return;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error("No screen video track was provided.");

    this.screenStream = stream;
    const replacements = [...this.peers.entries()].map(async ([peerId, peer]) => {
      const sender = peer.getSenders().find((item) => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: true });
    });
    await Promise.all(replacements);

    track.onended = () => { void this.stopScreenShare(); };
  }

  async stopScreenShare(): Promise<void> {
    const stream = this.screenStream;
    if (!stream) return;
    this.screenStream = null;

    const cameraTrack = this.localStream?.getVideoTracks()[0] ?? null;
    const replacements = [...this.peers.entries()].map(async ([peerId, peer]) => {
      const sender = peer.getSenders().find((item) => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(cameraTrack);
      await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: false });
    });
    await Promise.all(replacements);
    stream.getTracks().forEach((track) => track.stop());
  }

  getPeerIds(): string[] { return [...this.peers.keys()]; }

  async closePeer(peerId: string, notify = true): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.close();
    this.peers.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.streams.delete(peerId);
    this.options.onPeerLeft?.(peerId);
    if (notify) await this.send({ type: "leave", peerId: this.options.peerId, targetPeerId: peerId });
  }

  async close(): Promise<void> {
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.pendingCandidates.clear();
    this.streams.clear();
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.screenStream = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.unsubscribeSignal?.();
    this.unsubscribeSignal = null;
  }

  private createPeer(peerId: string): RTCPeerConnection {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const peer = new RTCPeerConnection({ iceServers: this.options.iceServers ?? [] });
    this.localStream?.getTracks().forEach((track) => peer.addTrack(track, this.localStream as MediaStream));

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      void this.send({ type: "ice-candidate", peerId: this.options.peerId, targetPeerId: peerId, candidate: event.candidate.toJSON() });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      this.streams.set(peerId, stream);
      this.options.onRemoteStream?.(peerId, stream);
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      this.options.onConnectionStateChange?.(peerId, state);
      if (state === "failed") void this.restartIce(peerId);
      if (state === "disconnected") {
        window.setTimeout(() => {
          const current = this.peers.get(peerId);
          if (current?.connectionState === "disconnected") void this.restartIce(peerId);
        }, 1500);
      }
      if (state === "closed") {
        this.peers.delete(peerId);
        this.pendingCandidates.delete(peerId);
        this.streams.delete(peerId);
        this.options.onPeerLeft?.(peerId);
      }
    };

    this.peers.set(peerId, peer);
    return peer;
  }

  private async handleSignal(signal: MeetingSignal): Promise<void> {
    if ("targetPeerId" in signal && signal.targetPeerId !== this.options.peerId) return;
    if (signal.peerId === this.options.peerId) return;

    switch (signal.type) {
      case "offer": {
        const peer = this.createPeer(signal.peerId);
        await peer.setRemoteDescription(signal.sdp);
        await this.flushPendingCandidates(signal.peerId, peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await this.send({ type: "answer", peerId: this.options.peerId, targetPeerId: signal.peerId, sdp: answer });
        return;
      }
      case "answer": {
        const peer = this.peers.get(signal.peerId);
        if (!peer) return;
        await peer.setRemoteDescription(signal.sdp);
        await this.flushPendingCandidates(signal.peerId, peer);
        return;
      }
      case "ice-candidate": {
        const peer = this.peers.get(signal.peerId) ?? this.createPeer(signal.peerId);
        if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
        else {
          const queue = this.pendingCandidates.get(signal.peerId) ?? [];
          queue.push(signal.candidate);
          this.pendingCandidates.set(signal.peerId, queue);
        }
        return;
      }
      case "screen-share":
        this.options.onScreenShareChange?.(signal.peerId, signal.enabled);
        return;
      case "leave":
        await this.closePeer(signal.peerId, false);
        return;
      default:
        return;
    }
  }

  private async restartIce(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer || this.reconnecting.has(peerId)) return;
    this.reconnecting.add(peerId);
    try {
      const offer = await peer.createOffer({ iceRestart: true });
      await peer.setLocalDescription(offer);
      await this.send({ type: "offer", peerId: this.options.peerId, targetPeerId: peerId, sdp: offer });
    } finally {
      this.reconnecting.delete(peerId);
    }
  }

  private async flushPendingCandidates(peerId: string, peer: RTCPeerConnection): Promise<void> {
    const queue = this.pendingCandidates.get(peerId);
    if (!queue?.length) return;
    for (const candidate of queue) await peer.addIceCandidate(candidate);
    this.pendingCandidates.delete(peerId);
  }

  private async send(signal: MeetingSignal): Promise<void> {
    await this.options.channel.send({ type: "broadcast", event: "webrtc-signal", payload: signal });
  }
}
