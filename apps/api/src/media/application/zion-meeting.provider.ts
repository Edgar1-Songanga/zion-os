import { Injectable } from '@nestjs/common';
import { MediaProvider, MediaRoom } from './media-provider';

@Injectable()
export class ZionMeetingProvider implements MediaProvider {
  async createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom> {
    return {
      provider: 'ZION_INTERNAL',
      providerRoomId: `zion-room:${input.meetingId}`,
      providerRoomUrl: `/meetings/${input.meetingId}/room`,
    };
  }

  async openRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    // The room lifecycle is owned by ZION Governance.
    // Native WebRTC/SFU transport will attach to this provider later.
  }

  async closeRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    // The room lifecycle is owned by ZION Governance.
  }
}
