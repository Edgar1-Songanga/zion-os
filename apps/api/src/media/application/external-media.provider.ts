import { Injectable } from '@nestjs/common';
import { MediaProvider, MediaRoom } from './media-provider';

@Injectable()
export class ExternalMediaProvider implements MediaProvider {
  async createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom> {
    return {
      provider: 'EXTERNAL',
      providerRoomId: null,
      providerRoomUrl: null,
    };
  }

  async openRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    // External provider integration is intentionally deferred.
  }

  async closeRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    // External provider integration is intentionally deferred.
  }
}
