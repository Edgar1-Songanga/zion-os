import { BadGatewayException, Injectable } from '@nestjs/common';
import { env } from '../../config/env';
import { MediaJoinConfig, MediaProvider, MediaRoom } from './media-provider';

type SfuRoomResponse = { room_id?: string; room_url?: string };
type SfuJoinResponse = { token?: string; join_url?: string };

@Injectable()
export class ZionSfuProvider implements MediaProvider {
  private readonly baseUrl = env.sfuUrl.replace(/\/$/, '');

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.baseUrl || !env.sfuControlSecret) {
      throw new BadGatewayException('ZION SFU is not configured');
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.sfuControlSecret}`,
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new BadGatewayException('ZION SFU control plane is unreachable');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(body || `ZION SFU request failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async createRoom(input: { meetingId: string; channelName: string }): Promise<MediaRoom> {
    const result = await this.request<SfuRoomResponse>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ meeting_id: input.meetingId, channel_name: input.channelName }),
    });
    if (!result.room_id) throw new BadGatewayException('ZION SFU did not return a room id');
    return {
      provider: 'ZION_SFU',
      providerRoomId: result.room_id,
      providerRoomUrl: result.room_url ?? null,
    };
  }

  async openRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    if (!input.providerRoomId) throw new BadGatewayException('SFU room id is missing');
    await this.request(`/rooms/${encodeURIComponent(input.providerRoomId)}/open`, {
      method: 'POST',
      body: JSON.stringify({ meeting_id: input.meetingId }),
    });
  }

  async closeRoom(input: { meetingId: string; providerRoomId?: string | null }): Promise<void> {
    if (!input.providerRoomId) throw new BadGatewayException('SFU room id is missing');
    await this.request(`/rooms/${encodeURIComponent(input.providerRoomId)}/close`, {
      method: 'POST',
      body: JSON.stringify({ meeting_id: input.meetingId }),
    });
  }

  async createJoinConfig(input: {
    meetingId: string;
    providerRoomId?: string | null;
    userId: string;
  }): Promise<MediaJoinConfig> {
    if (!input.providerRoomId) throw new BadGatewayException('SFU room id is missing');
    const result = await this.request<SfuJoinResponse>(
      `/rooms/${encodeURIComponent(input.providerRoomId)}/participants/token`,
      {
        method: 'POST',
        body: JSON.stringify({ meeting_id: input.meetingId, user_id: input.userId }),
      },
    );
    if (!result.token || !result.join_url) {
      throw new BadGatewayException('ZION SFU did not return a join configuration');
    }
    return {
      mode: 'SFU',
      provider: 'ZION_SFU',
      roomId: input.providerRoomId,
      joinUrl: result.join_url,
      token: result.token,
    };
  }
}
