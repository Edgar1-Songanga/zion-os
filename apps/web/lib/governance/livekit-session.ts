import { Room, RoomEvent, Track } from 'livekit-client';

export class LiveKitMeetingSession {
  private readonly room = new Room();
  private readonly onRemoteStream: (peerId: string, stream: MediaStream) => void;
  private readonly onPeerLeft: (peerId: string) => void;

  constructor(input: {
    onRemoteStream: (peerId: string, stream: MediaStream) => void;
    onPeerLeft: (peerId: string) => void;
    onConnectionStateChange?: (state: string) => void;
  }) {
    this.onRemoteStream = input.onRemoteStream;
    this.onPeerLeft = input.onPeerLeft;
    this.room
      .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
          this.onRemoteStream(participant.identity, new MediaStream([track.mediaStreamTrack]));
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => this.onPeerLeft(participant.identity))
      .on(RoomEvent.ParticipantDisconnected, (participant) => this.onPeerLeft(participant.identity))
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
    await this.room.localParticipant.setScreenShareEnabled(true);
  }

  async stopScreenShare() {
    await this.room.localParticipant.setScreenShareEnabled(false);
  }

  async close() {
    this.room.disconnect();
  }
}
