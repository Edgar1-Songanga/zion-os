export type MediaRoom = {
  provider: string;
  providerRoomId?: string | null;
  providerRoomUrl?: string | null;
};

export interface MediaProvider {
  createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom>;
  openRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
  closeRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void>;
}
