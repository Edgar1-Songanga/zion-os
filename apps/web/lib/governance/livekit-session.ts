import { Room, RoomEvent, Track } from 'livekit-client';

export class LiveKitMeetingSession {
  private readonly room = new Room();
  private mediaTracks: MediaStreamTrack[] = [];
  private readonly onRemoteTrack: (peerId: string, track: MediaStreamTrack, source: Track.Source, subscribed: boolean) => void;
  private readonly onPeerLeft: (peerId: string) => void;

  constructor(input: {
    onRemoteTrack: (peerId: string, track: MediaStreamTrack, source: Track.Source, subscribed: boolean) => void;
    onPeerLeft: (peerId: string) => void;
    onConnectionStateChange?: (state: string) => void;
    onLocalScreenShareChange?: (enabled: boolean) => void;
  }) {
    this.onRemoteTrack = input.onRemoteTrack;
    this.onPeerLeft = input.onPeerLeft;
    this.room
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
          this.onRemoteTrack(participant.identity, track.mediaStreamTrack, publication.source, true);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        this.onRemoteTrack(participant.identity, track.mediaStreamTrack, publication.source, false);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => this.onPeerLeft(participant.identity))
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) input.onLocalScreenShareChange?.(true);
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) input.onLocalScreenShareChange?.(false);
      })
      .on(RoomEvent.ConnectionStateChanged, (state) => input.onConnectionStateChange?.(String(state)));
  }

  async connect(url: string, token: string) {
    await this.room.connect(url, token, { autoSubscribe: true });
  }

  async startLocalMedia(): Promise<MediaStream> {
    await this.room.localParticipant.setMicrophoneEnabled(true);
    await this.room.localParticipant.setCameraEnabled(true);
    const tracks = Array.from(this.room.localParticipant.trackPublications.values())
      .map((publication) => publication.track?.mediaStreamTrack)
      .filter((track): track is MediaStreamTrack => Boolean(track));
    return new MediaStream(tracks);
  }

  setAudioEnabled(enabled: boolean) {
    void this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  setVideoEnabled(enabled: boolean) {
    void this.room.localParticipant.setCameraEnabled(enabled);
  }

  async startScreenShare() {
    await this.room.localParticipant.setScreenShareEnabled(true, { audio: true });
  }

  async stopScreenShare() {
    await this.room.localParticipant.setScreenShareEnabled(false);
  }

  async startMediaBroadcast(element: HTMLMediaElement) {
    if (this.mediaTracks.length) throw new Error("Já existe um conteúdo multimédia em transmissão.");
    await element.play();
    const capturable = element as HTMLMediaElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const stream = capturable.captureStream?.() ?? capturable.mozCaptureStream?.();
    if (!stream) throw new Error("Este navegador não permite capturar o leitor. Use a partilha de separador/ecrã com áudio.");
    const tracks = stream.getTracks().filter((track) => track.readyState === "live");
    if (!tracks.length) throw new Error("O leitor ainda não disponibilizou faixas de áudio/vídeo.");
    try {
      for (const track of tracks) {
        await this.room.localParticipant.publishTrack(track, {
          name: "zion-meeting-lobby-" + track.kind,
          source: track.kind === "video" ? Track.Source.ScreenShare : Track.Source.ScreenShareAudio,
        });
      }
      this.mediaTracks = tracks;
    } catch (error) {
      for (const track of tracks) {
        try { await this.room.localParticipant.unpublishTrack(track, false); } catch { /* Partial publication cleanup. */ }
        track.stop();
      }
      throw error;
    }
  }

  async stopMediaBroadcast() {
    const tracks = this.mediaTracks;
    this.mediaTracks = [];
    for (const track of tracks) {
      try { await this.room.localParticipant.unpublishTrack(track, false); } catch { /* Track may already be unpublished. */ }
      track.stop();
    }
  }

  async close() {
    await this.stopMediaBroadcast();
    this.room.disconnect();
  }
}
