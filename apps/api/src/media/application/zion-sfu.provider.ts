import { BadGatewayException, Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, TrackSource, VideoGrant } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { MediaJoinConfig, MediaProvider, MediaRoom, MediaTrackSource } from './media-provider';

@Injectable()
export class ZionSfuProvider implements MediaProvider {
  private configured() {
    return Boolean(env.livekitUrl && env.livekitApiKey && env.livekitApiSecret);
  }

  private client() {
    if (!this.configured()) throw new BadGatewayException('ZION media server is not configured');
    return new RoomServiceClient(env.livekitUrl, env.livekitApiKey, env.livekitApiSecret);
  }

  async createRoom(input: { meetingId: string; channelName: string; maxParticipants?: number }): Promise<MediaRoom> {
    try {
      const roomName = 'zion-' + input.meetingId;
      await this.client().createRoom({
        name: roomName,
        emptyTimeout: 10 * 60,
        maxParticipants: Math.min(Math.max(input.maxParticipants ?? 200, 2), 200),
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
      throw new BadGatewayException(error instanceof Error ? error.message : 'ZION media room could not be closed');
    }
  }

  async createJoinConfig(input: { meetingId: string; providerRoomId?: string | null; userId: string; name?: string; canPublish?: boolean; canPublishSources?: MediaTrackSource[]; ttl?: string }): Promise<MediaJoinConfig> {
    if (!input.providerRoomId || !this.configured()) {
      throw new BadGatewayException('ZION media server is not configured');
    }
    try {
      const canPublish = input.canPublish !== false;
      const grant: VideoGrant = {
        roomJoin: true,
        room: input.providerRoomId,
        canPublish,
        ...(canPublish && input.canPublishSources ? { canPublishSources: this.toTrackSources(input.canPublishSources) } : {}),
        canSubscribe: true,
        canPublishData: true,
      };
      const accessToken = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
        identity: input.userId,
        ...(input.name ? { name: input.name } : {}),
        ttl: input.ttl ?? '1h',
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

  private toTrackSources(sources: MediaTrackSource[]): TrackSource[] {
    const sourceMap: Record<MediaTrackSource, TrackSource> = {
      camera: TrackSource.CAMERA,
      microphone: TrackSource.MICROPHONE,
      screen_share: TrackSource.SCREEN_SHARE,
      screen_share_audio: TrackSource.SCREEN_SHARE_AUDIO,
    };
    return [...new Set(sources)].map((source) => sourceMap[source]);
  }

  async setParticipantPublishing(input: { roomId: string; identity: string; canPublish: boolean }): Promise<void> {
    return this.setParticipantPermissions({
      ...input,
      canPublishSources: input.canPublish ? ['camera', 'microphone'] : [],
    });
  }

  async setParticipantPermissions(input: {
    roomId: string;
    identity: string;
    canPublish: boolean;
    canPublishSources?: MediaTrackSource[];
  }): Promise<void> {
    try {
      const canPublishSources = input.canPublish
        ? this.toTrackSources(input.canPublishSources ?? ['camera', 'microphone'])
        : [];
      await this.client().updateParticipant(input.roomId, input.identity, {
        permission: {
          canPublish: input.canPublish,
          ...(input.canPublish ? { canPublishSources } : {}),
          canSubscribe: true,
          canPublishData: true,
        },
      });
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'Participant permissions could not be updated');
    }
  }

  async setRoomPublishingForAttendees(input: { roomId: string; hostIdentity: string; canPublish: boolean }): Promise<void> {
    try {
      // The room-wide switch is a safety lock, not a blanket presenter grant.
      // Opening the gate must not promote every spectator; only an explicit
      // allow_speak action may grant publishing to an individual participant.
      if (input.canPublish) return;
      const client = this.client();
      const participants = await client.listParticipants(input.roomId);
      await Promise.all(participants
        .filter((participant) => participant.identity !== input.hostIdentity)
        .map((participant) => client.updateParticipant(input.roomId, participant.identity, {
          permission: { canPublish: false, canSubscribe: true, canPublishData: true },
        })));
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'Room publishing policy could not be applied');
    }
  }

  async setParticipantAudioMuted(input: { roomId: string; identity: string; muted: boolean }): Promise<void> {
    try {
      const client = this.client();
      const participants = await client.listParticipants(input.roomId);
      const participant = participants.find((item) => item.identity === input.identity);
      if (!participant) throw new BadGatewayException('Participant is not connected to this live');
      const audioTracks = (participant.tracks ?? []).filter((track) =>
        String(track.source).toUpperCase().includes('MICROPHONE') ||
        String(track.type).toUpperCase().includes('AUDIO'),
      );
      if (!audioTracks.length) throw new BadGatewayException('Participant has no active audio track');
      await Promise.all(audioTracks.map((track) =>
        client.mutePublishedTrack(input.roomId, input.identity, track.sid, input.muted),
      ));
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(error instanceof Error ? error.message : 'Participant audio could not be muted');
    }
  }

  async removeParticipant(input: { roomId: string; identity: string }): Promise<void> {
    try {
      await this.client().removeParticipant(input.roomId, input.identity);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // LiveKit Cloud revokes a participant's token even when the participant is already offline.
      // Treat that expected not-found response as successful moderation; self-hosted deployments
      // still rely on the short token TTL configured for RESA group meetings.
      if (/participant.*(?:does not exist|not found)|not found.*participant/i.test(message)) return;
      throw new BadGatewayException(message || 'Participant could not be removed');
    }
  }
}
