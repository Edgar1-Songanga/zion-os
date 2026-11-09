import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { MEDIA_PROVIDER } from '../../media/media.module';
import type { MediaProvider, MediaTrackSource } from '../../media/application/media-provider';

const PRESENTER_SOURCES: MediaTrackSource[] = [
  'camera',
  'microphone',
  'screen_share',
  'screen_share_audio',
];
const PARTICIPANT_SOURCES: MediaTrackSource[] = ['camera', 'microphone'];

@Injectable()
export class ResaGroupMeetingService {
  private readonly db = new SupabaseRestClient();

  constructor(
    private readonly identity: IdentityService,
    @Inject(MEDIA_PROVIDER) private readonly media: MediaProvider,
  ) {}

  private async actor(token: string) {
    const user = await this.identity.getCurrentUser(token);
    if (!user?.id) throw new NotFoundException('Authenticated user was not found');
    return user;
  }

  private id(value: unknown, field: string): string {
    if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return value;
  }

  private text(value: unknown, field: string, min = 1, max = 10000): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
    const result = value.trim();
    if (result.length < min) throw new BadRequestException(`${field} is required`);
    if (result.length > max) throw new BadRequestException(`${field} is too long`);
    return result;
  }

  private async participant(token: string, meetingId: string, userId: string) {
    const rows = await this.db.get<any[]>('resa_group_meeting_participants', token,
      `?select=meeting_id,user_id,participant_role,status,joined_at,left_at&meeting_id=eq.${meetingId}&user_id=eq.${userId}&limit=1`);
    return rows[0] ?? null;
  }

  private async requireModerator(token: string, meetingId: string) {
    const actor = await this.actor(token);
    const participant = await this.participant(token, meetingId, actor.id);
    if (!participant || !['HOST', 'MODERATOR'].includes(participant.participant_role)
      || !['ACCEPTED', 'PRESENT'].includes(participant.status)) {
      throw new ForbiddenException('Host or moderator privileges are required');
    }
    return { actor, participant };
  }

  async list(token: string, limit = 30) {
    await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    return this.db.get<any[]>('resa_group_meetings', token,
      `?select=*&order=scheduled_at.asc&limit=${size}`);
  }

  async get(token: string, meetingId: string) {
    await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    const meetings = await this.db.get<any[]>('resa_group_meetings', token,
      `?select=*&id=eq.${id}&limit=1`);
    const meeting = meetings[0];
    if (!meeting) throw new NotFoundException('Meeting not found');
    const [participants, rooms, events] = await Promise.all([
      this.db.get<any[]>('resa_group_meeting_participants', token,
        `?select=meeting_id,user_id,participant_role,status,joined_at,left_at&meeting_id=eq.${id}&order=created_at.asc`),
      this.db.get<any[]>('resa_group_meeting_rooms', token,
        `?select=meeting_id,channel_name,provider,provider_room_url,status,locked,lock_reason&meeting_id=eq.${id}&limit=1`),
      this.db.get<any[]>('resa_group_meeting_events', token,
        `?select=id,actor_user_id,event_type,payload,created_at&meeting_id=eq.${id}&order=created_at.asc&limit=200`),
    ]);
    const profileRows = participants.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, {
        p_user_ids: participants.map((participant) => participant.user_id),
      })
      : [];
    const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));
    const visibleParticipants = participants.map((participant) => {
      const profile = profileById.get(participant.user_id);
      return {
        ...participant,
        display_name: profile?.display_name?.trim()
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
          || 'Membro RESA',
        avatar_url: profile?.avatar_url ?? null,
      };
    });
    return { ...meeting, participants: visibleParticipants, room: rooms[0] ?? null, events };
  }

  async create(token: string, input: {
    title: unknown;
    description?: unknown;
    scheduled_at: unknown;
    visibility?: unknown;
    max_participants?: unknown;
  }) {
    const actor = await this.actor(token);
    const title = this.text(input.title, 'title', 2, 160);
    const scheduledAt = this.text(input.scheduled_at, 'scheduled_at', 1, 80);
    const scheduledTimestamp = Date.parse(scheduledAt);
    if (Number.isNaN(scheduledTimestamp) || scheduledTimestamp <= Date.now()) {
      throw new BadRequestException('scheduled_at must be a future date');
    }
    const visibility = input.visibility ?? 'INVITE_ONLY';
    if (!['INVITE_ONLY', 'PUBLIC'].includes(visibility as string)) {
      throw new BadRequestException('Invalid meeting visibility');
    }
    const maxParticipants = Number(input.max_participants ?? 100);
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 200) {
      throw new BadRequestException('max_participants must be between 2 and 200');
    }

    const rows = await this.db.post<any[]>('resa_group_meetings', token, {
      host_user_id: actor.id,
      title,
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
      scheduled_at: new Date(scheduledTimestamp).toISOString(),
      visibility,
      max_participants: maxParticipants,
      status: 'SCHEDULED',
    });
    const meeting = rows[0];
    if (!meeting?.id) throw new BadGatewayException('Meeting could not be created');

    const channelName = `resa:group:${meeting.id}`;
    let mediaRoom: Awaited<ReturnType<MediaProvider['createRoom']>> | null = null;
    try {
      mediaRoom = await this.media.createRoom({ meetingId: meeting.id, channelName, maxParticipants });
      const roomRows = await this.db.post<any[]>('resa_group_meeting_rooms', token, {
        meeting_id: meeting.id,
        channel_name: channelName,
        provider: mediaRoom.provider,
        provider_room_id: mediaRoom.providerRoomId ?? null,
        provider_room_url: mediaRoom.providerRoomUrl ?? null,
        max_participants: maxParticipants,
        status: 'READY',
      });
      if (!roomRows[0]) throw new Error('Room metadata was not persisted');
      await this.recordEvent(token, meeting.id, actor.id, 'MEETING_CREATED', { visibility, max_participants: maxParticipants });
      return { ...meeting, room: roomRows[0] };
    } catch (error) {
      if (mediaRoom) {
        try {
          await this.media.closeRoom({ meetingId: meeting.id, providerRoomId: mediaRoom.providerRoomId });
        } catch {
          // The meeting is cancelled below; a failed SFU cleanup is surfaced to observability.
        }
      }
      await this.db.patch('resa_group_meetings', token, { status: 'CANCELLED' }, `?id=eq.${meeting.id}`);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadGatewayException('Meeting media room could not be initialized');
    }
  }

  async invite(token: string, meetingId: string, userId: string, role: 'PARTICIPANT' | 'VIEWER' | 'MODERATOR' = 'PARTICIPANT') {
    const id = this.id(meetingId, 'meeting_id');
    const targetId = this.id(userId, 'user_id');
    const { actor, participant } = await this.requireModerator(token, id);
    if (targetId === actor.id) throw new BadRequestException('You are already the meeting host or moderator');
    if (!['PARTICIPANT', 'VIEWER', 'MODERATOR'].includes(role)) throw new BadRequestException('Invalid participant role');
    if (role === 'MODERATOR' && participant.participant_role !== 'HOST') {
      throw new ForbiddenException('Only the host can appoint a moderator');
    }
    const rows = await this.db.post<any[]>('resa_group_meeting_participants', token, {
      meeting_id: id,
      user_id: targetId,
      participant_role: role,
      status: 'INVITED',
      invited_by: actor.id,
    });
    if (!rows[0]) throw new BadGatewayException('Invitation could not be saved');
    await this.recordEvent(token, id, actor.id, 'INVITATION_SENT', { target_user_id: targetId, role });
    return rows[0];
  }

  async respond(token: string, meetingId: string, response: 'ACCEPTED' | 'DECLINED') {
    const actor = await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    if (!['ACCEPTED', 'DECLINED'].includes(response)) throw new BadRequestException('Invalid invitation response');
    const rows = await this.db.patch<any[]>('resa_group_meeting_participants', token, { status: response },
      `?meeting_id=eq.${id}&user_id=eq.${actor.id}&status=eq.INVITED`);
    if (!rows[0]) throw new NotFoundException('Active meeting invitation not found');
    await this.recordEvent(token, id, actor.id,
      response === 'ACCEPTED' ? 'INVITATION_ACCEPTED' : 'INVITATION_DECLINED', {});
    return rows[0];
  }

  async joinPublic(token: string, meetingId: string) {
    const actor = await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    const meetings = await this.db.get<any[]>('resa_group_meetings', token,
      `?select=id,visibility,status&id=eq.${id}&limit=1`);
    const meeting = meetings[0];
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.visibility !== 'PUBLIC' || !['SCHEDULED', 'OPEN'].includes(meeting.status)) {
      throw new ForbiddenException('This meeting is not open to public viewers');
    }
    const existing = await this.participant(token, id, actor.id);
    if (existing) {
      if (['ACCEPTED', 'PRESENT', 'LEFT'].includes(existing.status)) return existing;
      if (existing.status === 'INVITED') return this.respond(token, id, 'ACCEPTED');
      throw new ForbiddenException('This account is no longer eligible to join this meeting');
    }
    const rows = await this.db.post<any[]>('resa_group_meeting_participants', token, {
      meeting_id: id,
      user_id: actor.id,
      participant_role: 'VIEWER',
      status: 'ACCEPTED',
    });
    if (!rows[0]) throw new BadGatewayException('Public viewer admission was not persisted');
    return rows[0];
  }

  async start(token: string, meetingId: string) {
    const id = this.id(meetingId, 'meeting_id');
    const { actor } = await this.requireModerator(token, id);
    const meetings = await this.db.get<any[]>('resa_group_meetings', token,
      `?select=id,status&id=eq.${id}&limit=1`);
    if (!meetings[0]) throw new NotFoundException('Meeting not found');
    if (meetings[0].status === 'OPEN') return meetings[0];
    if (meetings[0].status !== 'SCHEDULED') throw new BadRequestException('Meeting cannot be started in its current state');
    const rooms = await this.db.get<any[]>('resa_group_meeting_rooms', token,
      `?select=provider_room_id,status&meeting_id=eq.${id}&limit=1`);
    const room = rooms[0];
    if (!room || room.status !== 'READY') throw new BadRequestException('Meeting room is not ready');
    await this.media.openRoom({ meetingId: id, providerRoomId: room.provider_room_id });
    try {
      const roomRows = await this.db.patch<any[]>('resa_group_meeting_rooms', token, { status: 'OPEN' }, `?meeting_id=eq.${id}`);
      const meetingRows = await this.db.patch<any[]>('resa_group_meetings', token,
        { status: 'OPEN', started_at: new Date().toISOString() }, `?id=eq.${id}&status=eq.SCHEDULED`);
      if (!roomRows[0] || !meetingRows[0]) throw new Error('Meeting state transition was not persisted');
      await this.recordEvent(token, id, actor.id, 'ROOM_OPENED', {});
      return meetingRows[0];
    } catch {
      try {
        await this.media.closeRoom({ meetingId: id, providerRoomId: room.provider_room_id });
        await this.db.patch('resa_group_meeting_rooms', token, { status: 'READY' }, `?meeting_id=eq.${id}`);
      } catch { /* Cleanup failure is handled by the room monitor. */ }
      throw new BadGatewayException('Meeting could not be started safely');
    }
  }

  async joinConfig(token: string, meetingId: string) {
    const actor = await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    const meetings = await this.db.get<any[]>('resa_group_meetings', token,
      `?select=id,status,title&id=eq.${id}&limit=1`);
    const meeting = meetings[0];
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.status !== 'OPEN') throw new BadRequestException('Meeting is not open');
    const participant = await this.participant(token, id, actor.id);
    if (!participant || !['ACCEPTED', 'PRESENT', 'LEFT'].includes(participant.status)) {
      throw new ForbiddenException('An accepted meeting invitation is required');
    }
    const rooms = await this.db.get<any[]>('resa_group_meeting_rooms', token,
      `?select=provider_room_id,status,locked&meeting_id=eq.${id}&limit=1`);
    const room = rooms[0];
    if (!room || room.status !== 'OPEN') throw new BadRequestException('Meeting room is not open');
    if (room.locked) throw new ForbiddenException('Meeting room is locked');
    if (!this.media.createJoinConfig) throw new BadGatewayException('Media provider does not expose join configuration');
    const role = String(participant.participant_role).toUpperCase();
    const canPublish = role !== 'VIEWER';
    const canShareScreen = ['HOST', 'MODERATOR', 'PRESENTER'].includes(role);
    return this.media.createJoinConfig({
      meetingId: id,
      providerRoomId: room.provider_room_id,
      userId: actor.id,
      name: meeting.title,
      canPublish,
      canPublishSources: canPublish
        ? (canShareScreen ? PRESENTER_SOURCES : PARTICIPANT_SOURCES)
        : [],
    });
  }

  async setPresence(token: string, meetingId: string, status: 'PRESENT' | 'LEFT') {
    const actor = await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    if (status === 'PRESENT') {
      const rows = await this.db.patch<any[]>('resa_group_meeting_participants', token,
        { status: 'PRESENT', joined_at: new Date().toISOString(), left_at: null },
        `?meeting_id=eq.${id}&user_id=eq.${actor.id}&status=in.(ACCEPTED,PRESENT,LEFT)`);
      if (!rows[0]) throw new BadRequestException('Accept the meeting invitation before joining');
      await this.recordEvent(token, id, actor.id, 'PARTICIPANT_JOINED', {});
      return rows[0];
    }
    const participants = await this.participant(token, id, actor.id);
    if (!participants || participants.status !== 'PRESENT') throw new BadRequestException('Participant is not currently in the meeting');
    const rows = await this.db.patch<any[]>('resa_group_meeting_participants', token,
      { status: 'LEFT', left_at: new Date().toISOString() },
      `?meeting_id=eq.${id}&user_id=eq.${actor.id}&status=eq.PRESENT`);
    if (!rows[0]) throw new BadRequestException('Could not update meeting presence');
    await this.recordEvent(token, id, actor.id, 'PARTICIPANT_LEFT', {});
    return rows[0];
  }

  async setPresenter(token: string, meetingId: string, userId: string, enabled: boolean) {
    const id = this.id(meetingId, 'meeting_id');
    const targetId = this.id(userId, 'user_id');
    const { actor } = await this.requireModerator(token, id);
    const target = await this.participant(token, id, targetId);
    if (!target || !['ACCEPTED', 'PRESENT', 'LEFT'].includes(target.status)) throw new NotFoundException('Active participant not found');
    if (['HOST', 'MODERATOR'].includes(target.participant_role)) {
      throw new BadRequestException('Host and moderators already have presenter permissions');
    }
    const previousRole = target.participant_role;
    if (!enabled && previousRole !== 'PRESENTER') return target;
    const nextRole = enabled ? 'PRESENTER' : 'PARTICIPANT';
    if (previousRole === nextRole) return target;

    if (target.status === 'PRESENT') {
      if (!this.media.setParticipantPermissions) throw new BadGatewayException('Media provider cannot update participant permissions');
      await this.media.setParticipantPermissions({
        roomId: (await this.roomProviderId(token, id)),
        identity: targetId,
        canPublish: true,
        canPublishSources: enabled ? PRESENTER_SOURCES : PARTICIPANT_SOURCES,
      });
    }

    try {
      const rows = await this.db.patch<any[]>('resa_group_meeting_participants', token,
        { participant_role: nextRole }, `?meeting_id=eq.${id}&user_id=eq.${targetId}`);
      if (!rows[0]) throw new Error('Presenter role was not persisted');
      await this.recordEvent(token, id, actor.id, 'ROLE_CHANGED', { target_user_id: targetId, from: previousRole, to: nextRole });
      return rows[0];
    } catch {
      if (target.status === 'PRESENT' && this.media.setParticipantPermissions) {
        try {
          await this.media.setParticipantPermissions({
            roomId: await this.roomProviderId(token, id),
            identity: targetId,
            canPublish: true,
            canPublishSources: previousRole === 'PRESENTER' ? PRESENTER_SOURCES : PARTICIPANT_SOURCES,
          });
        } catch {
          // A failed SFU rollback is a critical media permission incident; log only safe identifiers.
          console.error(JSON.stringify({ event: 'resa_group_meeting_permission_rollback_failed', meetingId: id }));
        }
      }
      throw new BadGatewayException('Presenter permissions could not be persisted');
    }
  }

  private async roomProviderId(token: string, meetingId: string) {
    const rows = await this.db.get<any[]>('resa_group_meeting_rooms', token,
      `?select=provider_room_id&meeting_id=eq.${meetingId}&limit=1`);
    if (!rows[0]?.provider_room_id) throw new BadGatewayException('Media room identifier is missing');
    return rows[0].provider_room_id as string;
  }

  async lock(token: string, meetingId: string, locked: boolean, reason?: string) {
    const id = this.id(meetingId, 'meeting_id');
    const { actor } = await this.requireModerator(token, id);
    const rows = await this.db.patch<any[]>('resa_group_meeting_rooms', token,
      { locked, lock_reason: locked ? (reason?.trim() || 'Room locked by moderator') : null },
      `?meeting_id=eq.${id}`);
    if (!rows[0]) throw new NotFoundException('Meeting room not found');
    await this.recordEvent(token, id, actor.id, 'MODERATOR_ACTION', { action: locked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED' });
    return rows[0];
  }

  async end(token: string, meetingId: string) {
    const id = this.id(meetingId, 'meeting_id');
    const { actor } = await this.requireModerator(token, id);
    const meetings = await this.db.get<any[]>('resa_group_meetings', token,
      `?select=status&id=eq.${id}&limit=1`);
    if (!meetings[0]) throw new NotFoundException('Meeting not found');
    if (meetings[0].status !== 'OPEN') throw new BadRequestException('Only an open meeting can be ended');
    const rooms = await this.db.get<any[]>('resa_group_meeting_rooms', token,
      `?select=provider_room_id,status&meeting_id=eq.${id}&limit=1`);
    const room = rooms[0];
    if (!room) throw new NotFoundException('Meeting room not found');
    if (room.status !== 'CLOSED') {
      await this.media.closeRoom({ meetingId: id, providerRoomId: room.provider_room_id });
      await this.db.patch('resa_group_meeting_rooms', token, { status: 'CLOSED', locked: true }, `?meeting_id=eq.${id}`);
    }
    const rows = await this.db.patch<any[]>('resa_group_meetings', token,
      { status: 'ENDED', ended_at: new Date().toISOString() }, `?id=eq.${id}&status=eq.OPEN`);
    if (!rows[0]) throw new BadRequestException('Meeting is not open or has already ended');
    await this.recordEvent(token, id, actor.id, 'MEETING_ENDED', {});
    return rows[0];
  }

  async removeParticipant(token: string, meetingId: string, userId: string) {
    const id = this.id(meetingId, 'meeting_id');
    const targetId = this.id(userId, 'user_id');
    const { actor, participant: moderator } = await this.requireModerator(token, id);
    const target = await this.participant(token, id, targetId);
    if (!target) throw new NotFoundException('Participant not found');
    if (target.participant_role === 'HOST') throw new ForbiddenException('The meeting host cannot be removed');
    if (target.participant_role === 'MODERATOR' && moderator.participant_role !== 'HOST') {
      throw new ForbiddenException('Only the host can remove another moderator');
    }
    if (target.status === 'PRESENT') {
      if (!this.media.removeParticipant) throw new BadGatewayException('Media provider cannot remove participants');
      await this.media.removeParticipant({ roomId: await this.roomProviderId(token, id), identity: targetId });
    }
    const patch: Record<string, unknown> = { status: 'REMOVED' };
    if (target.joined_at) patch.left_at = new Date().toISOString();
    const rows = await this.db.patch<any[]>('resa_group_meeting_participants', token, patch,
      `?meeting_id=eq.${id}&user_id=eq.${targetId}`);
    if (!rows[0]) throw new BadGatewayException('Participant removal was not persisted');
    await this.recordEvent(token, id, actor.id, 'PARTICIPANT_REMOVED', { target_user_id: targetId });
    return rows[0];
  }

  async messages(token: string, meetingId: string, limit = 100) {
    await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    const size = Math.min(Math.max(Number(limit) || 100, 1), 200);
    return this.db.get<any[]>('resa_group_meeting_messages', token,
      `?select=id,meeting_id,sender_id,body,created_at&meeting_id=eq.${id}&order=created_at.asc&limit=${size}`);
  }

  async sendMessage(token: string, meetingId: string, rawBody: unknown) {
    const actor = await this.actor(token);
    const id = this.id(meetingId, 'meeting_id');
    const body = this.text(rawBody, 'body', 1, 10000);
    const rows = await this.db.post<any[]>('resa_group_meeting_messages', token, {
      meeting_id: id, sender_id: actor.id, body,
    });
    if (!rows[0]) throw new BadGatewayException('Meeting message was not persisted');
    return rows[0];
  }

  async recordEvent(token: string, meetingId: string, actorId: string, eventType: string, payload: unknown = {}) {
    const allowed = [
      'MEETING_CREATED', 'INVITATION_SENT', 'INVITATION_ACCEPTED', 'INVITATION_DECLINED',
      'PARTICIPANT_JOINED', 'PARTICIPANT_LEFT', 'PARTICIPANT_REMOVED', 'ROLE_CHANGED',
      'ROOM_OPENED', 'ROOM_CLOSED', 'ROOM_LOCKED', 'ROOM_UNLOCKED',
      'SCREEN_SHARE_STARTED', 'SCREEN_SHARE_STOPPED', 'MODERATOR_ACTION', 'MEETING_ENDED',
    ];
    if (!allowed.includes(eventType)) throw new BadRequestException('Invalid meeting event');
    try {
      const rows = await this.db.post<any[]>('resa_group_meeting_events', token, {
        meeting_id: meetingId,
        actor_user_id: actorId,
        event_type: eventType,
        payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {},
      });
      return rows[0] ?? null;
    } catch {
      // Audit telemetry must not report a failed meeting mutation after the state change already committed.
      // Keep the failure observable without logging user content or bearer/session data.
      console.error(JSON.stringify({
        event: 'resa_group_meeting_audit_event_failed',
        meetingId,
        eventType,
      }));
      return null;
    }
  }
}
