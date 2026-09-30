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
  createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom>;
  openRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
  closeRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
  createJoinConfig?(input: {
    meetingId: string;
    providerRoomId?: string | null;
    userId: string;
  }): Promise<MediaJoinConfig>;
}
