export type MediaTrackSource = 'camera' | 'microphone' | 'screen_share' | 'screen_share_audio';

export type MediaRoom = {
  provider: string;
  providerRoomId?: string | null;
  providerRoomUrl?: string | null;
};

export type MediaJoinConfig = {
  mode: 'P2P' | 'SFU';
  provider: string;
  roomId: string;
  joinUrl?: string | null;
  token?: string | null;
  iceServers?: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
};

export interface MediaProvider {
  createRoom(input: { meetingId: string; channelName: string; maxParticipants?: number }): Promise<MediaRoom>;
  openRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
  closeRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
  createJoinConfig?(input: {
    meetingId: string;
    providerRoomId?: string | null;
    userId: string;
    name?: string;
    canPublish?: boolean;
    canPublishSources?: MediaTrackSource[];
  }): Promise<MediaJoinConfig>;
  setParticipantPublishing?(input: {
    roomId: string;
    identity: string;
    canPublish: boolean;
  }): Promise<void>;
  setParticipantPermissions?(input: {
    roomId: string;
    identity: string;
    canPublish: boolean;
    canPublishSources?: MediaTrackSource[];
  }): Promise<void>;
  removeParticipant?(input: { roomId: string; identity: string }): Promise<void>;
  setRoomPublishingForAttendees?(input: { roomId: string; hostIdentity: string; canPublish: boolean }): Promise<void>;
}
