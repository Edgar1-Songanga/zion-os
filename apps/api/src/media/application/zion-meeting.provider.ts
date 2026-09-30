import { Injectable } from '@nestjs/common';
import { getIceServers } from '../../config/env';
import { MediaJoinConfig, MediaProvider, MediaRoom } from './media-provider';

@Injectable()
export class ZionMeetingProvider implements MediaProvider {
  async createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom> {
    return {
      provider: 'ZION_INTERNAL',
      providerRoomId: `zion-room:${input.meetingId}`,
      providerRoomUrl: `/meetings/${input.meetingId}/room`,
    };
  }

  async openRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {}
  async closeRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {}

  async createJoinConfig(input: {
    meetingId: string;
    providerRoomId?: string | null;
    userId: string;
  }): Promise<MediaJoinConfig> {
    return {
      mode: 'P2P',
      provider: 'ZION_INTERNAL',
      roomId: input.providerRoomId ?? `zion-room:${input.meetingId}`,
      joinUrl: `/meetings/${input.meetingId}/room`,
      iceServers: getIceServers(),
    };
  }
}
