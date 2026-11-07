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
  onLocalScreenShareChange?: (enabled: boolean) => void;
};

export class WebRtcSession {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private readonly streams = new Map<string, MediaStream>();
  private readonly options: WebRtcSessionOptions;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenAudioContext: AudioContext | null = null;
  private screenAudioDestination: MediaStreamAudioDestinationNode | null = null;
  private screenAudioTrack: MediaStreamTrack | null = null;
  private screenAudioMicTrackId: string | null = null;
  private mediaBroadcastStream: MediaStream | null = null;
  private reconnecting = new Set<string>();
  private unsubscribeSignal: (() => void) | null = null;

  constructor(options: WebRtcSessionOptions) {
    this.options = options;
    onMeetingSignal(options.channel, (signal) => {
      void this.handleSignal(signal);
    });
  }

  async startLocalMedia(): Promise<MediaStream> {
    // Do not request devices merely to enter the waiting room.
    this.localStream = new MediaStream();
    return this.localStream;
  }

  getLocalStream(): MediaStream { return this.localStream ?? new MediaStream(); }
  getScreenStream(): MediaStream | null { return this.screenStream; }

  async connectToPeer(peerId: string, initiator = true): Promise<void> {
    const peer = this.createPeer(peerId);
    if (!initiator) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await this.send({ type: "offer", peerId: this.options.peerId, targetPeerId: peerId, sdp: offer });
  }

  async setAudioEnabled(enabled: boolean): Promise<void> {
    await this.setLocalTrackEnabled("audio", enabled);
  }

  async setVideoEnabled(enabled: boolean): Promise<void> {
    await this.setLocalTrackEnabled("video", enabled);
  }

  async startScreenShare(): Promise<void> {
    if (this.screenStream) return;
    if (this.mediaBroadcastStream) throw new Error("Termine primeiro a transmissão do leitor.");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("No screen video track was provided.");
    }

    this.screenStream = stream;
    const displayAudioTrack = stream.getAudioTracks()[0] ?? null;
    if (displayAudioTrack && typeof AudioContext !== "undefined") {
      let context: AudioContext | null = null;
      try {
        context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        const displaySource = context.createMediaStreamSource(new MediaStream([displayAudioTrack]));
        displaySource.connect(destination);
        const microphoneTrack = this.localStream?.getAudioTracks()[0];
        if (microphoneTrack) {
          const microphoneSource = context.createMediaStreamSource(new MediaStream([microphoneTrack]));
          microphoneSource.connect(destination);
          this.screenAudioMicTrackId = microphoneTrack.id;
        }
        this.screenAudioContext = context;
        this.screenAudioDestination = destination;
        this.screenAudioTrack = destination.stream.getAudioTracks()[0] ?? null;
      } catch {
        if (context) await context.close().catch(() => {});
        this.screenAudioContext = null;
        this.screenAudioDestination = null;
        this.screenAudioMicTrackId = null;
        this.screenAudioTrack = displayAudioTrack;
      }
    } else {
      this.screenAudioTrack = displayAudioTrack;
    }

    const replacements = [...this.peers.entries()].map(async ([peerId, peer]) => {
      const videoSender = peer.getTransceivers().find((item) => item.receiver.track.kind === "video")?.sender;
      if (videoSender) await videoSender.replaceTrack(videoTrack);
      if (this.screenAudioTrack) {
        const audioSender = peer.getTransceivers().find((item) => item.receiver.track.kind === "audio")?.sender;
        if (audioSender) await audioSender.replaceTrack(this.screenAudioTrack);
      }
      await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: true });
    });
    try {
      await Promise.all(replacements);
      this.options.onLocalScreenShareChange?.(true);
    } catch (error) {
      await this.stopScreenShare();
      throw error;
    }

    videoTrack.onended = () => { void this.stopScreenShare(); };
  }

  async startMediaBroadcast(element: HTMLMediaElement): Promise<void> {
    if (this.mediaBroadcastStream) throw new Error("Já existe um conteúdo multimédia em transmissão.");
    if (this.screenStream) throw new Error("Termine primeiro a partilha de ecrã.");
    await element.play();
    const capturable = element as HTMLMediaElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const stream = capturable.captureStream?.() ?? capturable.mozCaptureStream?.();
    if (!stream) throw new Error("Este navegador não permite capturar o leitor. Use a partilha de separador/ecrã com áudio.");
    const tracks = stream.getTracks().filter((track) => track.readyState === "live");
    if (!tracks.length) throw new Error("O leitor ainda não disponibilizou faixas de áudio/vídeo.");
    this.mediaBroadcastStream = stream;
    try {
      for (const [peerId, peer] of this.peers.entries()) {
        for (const mediaTrack of tracks) {
          const sender = peer.getTransceivers().find((item) => item.receiver.track.kind === mediaTrack.kind)?.sender;
          if (sender) await sender.replaceTrack(mediaTrack);
        }
        if (tracks.some((track) => track.kind === "video")) {
          await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: true });
        }
      }
    } catch (error) {
      await this.stopMediaBroadcast();
      throw error;
    }
  }

  async stopMediaBroadcast(): Promise<void> {
    const stream = this.mediaBroadcastStream;
    if (!stream) return;
    this.mediaBroadcastStream = null;
    for (const [peerId, peer] of this.peers.entries()) {
      for (const mediaTrack of stream.getTracks()) {
        const sender = peer.getTransceivers().find((item) => item.receiver.track.kind === mediaTrack.kind)?.sender;
        const original = this.localStream?.getTracks().find((track) => track.kind === mediaTrack.kind) ?? null;
        if (sender) await sender.replaceTrack(original);
      }
      if (stream.getVideoTracks().length) {
        await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: false });
      }
    }
    stream.getTracks().forEach((track) => track.stop());
  }

  async stopScreenShare(): Promise<void> {
    const stream = this.screenStream;
    if (!stream) return;
    this.screenStream = null;

    const cameraTrack = this.localStream?.getVideoTracks()[0] ?? null;
    const microphoneTrack = this.localStream?.getAudioTracks()[0] ?? null;
    const replacements = [...this.peers.entries()].map(async ([peerId, peer]) => {
      const videoSender = peer.getTransceivers().find((item) => item.receiver.track.kind === "video")?.sender;
      if (videoSender) await videoSender.replaceTrack(cameraTrack);
      if (this.screenAudioTrack) {
        const audioSender = peer.getTransceivers().find((item) => item.receiver.track.kind === "audio")?.sender;
        if (audioSender) await audioSender.replaceTrack(microphoneTrack);
      }
      await this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: false });
    });
    await Promise.all(replacements);
    const outgoingAudioTrack = this.screenAudioTrack;
    this.screenAudioTrack = null;
    this.screenAudioDestination = null;
    this.screenAudioMicTrackId = null;
    if (outgoingAudioTrack && !stream.getAudioTracks().some((track) => track.id === outgoingAudioTrack.id)) {
      outgoingAudioTrack.stop();
    }
    if (this.screenAudioContext) {
      await this.screenAudioContext.close().catch(() => {});
      this.screenAudioContext = null;
    }
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
    await this.stopMediaBroadcast();
    await this.stopScreenShare();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.unsubscribeSignal?.();
    this.unsubscribeSignal = null;
  }

  private async setLocalTrackEnabled(kind: "audio" | "video", enabled: boolean): Promise<void> {
    if (!this.localStream) this.localStream = new MediaStream();
    let track = this.localStream.getTracks().find((item) => item.kind === kind);
    if (!track && enabled) {
      const captured = await navigator.mediaDevices.getUserMedia({
        audio: kind === "audio",
        video: kind === "video",
      });
      track = captured.getTracks().find((item) => item.kind === kind) ?? undefined;
      if (!track) throw new Error("O dispositivo não disponibilizou a faixa solicitada.");
      this.localStream.addTrack(track);
    }
    if (!track) return;
    track.enabled = enabled;
    if (kind === "audio" && this.screenAudioContext && this.screenAudioDestination &&
        this.screenAudioMicTrackId !== track.id) {
      const microphoneSource = this.screenAudioContext.createMediaStreamSource(new MediaStream([track]));
      microphoneSource.connect(this.screenAudioDestination);
      this.screenAudioMicTrackId = track.id;
    }
    const shareTrackActive = kind === "video"
      ? Boolean(this.screenStream?.getVideoTracks().length)
      : Boolean(this.screenAudioTrack);
    if (enabled && !shareTrackActive && !this.mediaBroadcastStream?.getTracks().some((item) => item.kind === kind)) {
      await Promise.all([...this.peers.values()].map(async (peer) => {
        const sender = peer.getTransceivers().find((item) => item.receiver.track.kind === kind)?.sender;
        if (sender) await sender.replaceTrack(track);
      }));
    }
  }

  private createPeer(peerId: string): RTCPeerConnection {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const peer = new RTCPeerConnection({ iceServers: this.options.iceServers ?? [] });
    peer.addTransceiver("audio", { direction: "sendrecv" });
    peer.addTransceiver("video", { direction: "sendrecv" });
    for (const transceiver of peer.getTransceivers()) {
      const kind = transceiver.receiver.track.kind;
      const screenTrack = kind === "video"
        ? this.screenStream?.getVideoTracks()[0]
        : this.screenAudioTrack;
      const mediaTrack = this.mediaBroadcastStream?.getTracks().find((candidate) => candidate.kind === kind);
      const localTrack = this.localStream?.getTracks().find((candidate) => candidate.kind === kind);
      const selectedTrack = screenTrack ?? mediaTrack ?? localTrack;
      if (selectedTrack) void transceiver.sender.replaceTrack(selectedTrack);
    }
    if (this.screenStream?.getVideoTracks().length || this.mediaBroadcastStream?.getVideoTracks().length) {
      void this.send({ type: "screen-share", peerId: this.options.peerId, targetPeerId: peerId, enabled: true });
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      void this.send({ type: "ice-candidate", peerId: this.options.peerId, targetPeerId: peerId, candidate: event.candidate.toJSON() });
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? this.streams.get(peerId) ?? new MediaStream();
      if (!event.streams[0] && !stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
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
