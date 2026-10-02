import { BadGatewayException, Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, VideoGrant } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { MediaJoinConfig, MediaProvider, MediaRoom } from './media-provider';

@Injectable()
export class ZionSfuProvider implements MediaProvider {
  private configured() {
    return Boolean(env.livekitUrl && env.livekitApiKey && env.livekitApiSecret);
  }

  private client() {
    if (!this.configured()) throw new BadGatewayException('ZION media server is not configured');
    return new RoomServiceClient(env.livekitUrl, env.livekitApiKey, env.livekitApiSecret);
  }

  async createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom> {
    try {
      const roomName = `zion-${input.meetingId}`;
      await this.client().createRoom({
        name: roomName,
        emptyTimeout: 10 * 60,
        maxParticipants: 200,
        metadata: JSON.stringify({ meeting_id: input.meetingId, channel_name: input.channelName }),
      });
      return { provider: 'ZION_SFU', providerRoomId: roomName, providerRoomUrl: env.livekitUrl };
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'ZION media server room creation failed');
    }
  }

  async openRoom(_input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    if (!this.configured()) throw new BadGatewayException('ZION media server is not configured');
  }

  async closeRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    if (!input.providerRoomId) throw new BadGatewayException('SFU room id is missing');
    try {
      await this.client().deleteRoom(input.providerRoomId);
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'ZION media server room close failed');
    }
  }

  async createJoinConfig(input: { meetingId: string; providerRoomId?: string | null; userId: string }): Promise<MediaJoinConfig> {
    if (!input.providerRoomId || !this.configured()) {
      throw new BadGatewayException('ZION media server is not configured');
    }
    try {
      const grant: VideoGrant = {
        roomJoin: true,
        room: input.providerRoomId,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      };
      const accessToken = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
        identity: input.userId,
        ttl: '1h',
      });
      accessToken.addGrant(grant);
      const token = await accessToken.toJwt();
      return {
        mode: 'SFU',
        provider: 'ZION_SFU',
        roomId: input.providerRoomId,
        joinUrl: env.livekitUrl,
        token,
      };
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'ZION media token creation failed');
    }
  }
}
