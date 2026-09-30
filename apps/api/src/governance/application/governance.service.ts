import { BadRequestException, Injectable } from '@nestjs/common';
import { getIceServers } from '../../config/env';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { Inject } from '@nestjs/common';
import { MEDIA_PROVIDER } from '../../media/media.module';
import { MediaProvider } from '../../media/application/media-provider';

@Injectable()
export class GovernanceService {
  private readonly db = new SupabaseRestClient();
  constructor(
    private readonly identity: IdentityService,
    @Inject(MEDIA_PROVIDER) private readonly media: MediaProvider,
  ) {}

  private async actor(token: string) { return this.identity.getCurrentUser(token); }

  private async audit(token: string, orgId: string, actorId: string, action: string, type: string, id: string, metadata: unknown = {}) {
    await this.db.post('audit_logs', token, {
      organization_id: orgId,
      actor_user_id: actorId,
      action,
      resource_type: type,
      resource_id: id,
      metadata,
    });
  }

  async councils(token: string, orgId: string) {
    return this.db.get('governance_councils', token, `?select=*&organization_id=eq.${orgId}&order=name.asc`);
  }

  async createCouncil(token: string, orgId: string, input: { name: string; description?: string; unit_id?: string | null }) {
    const a = await this.actor(token);
    if (!input.name?.trim()) throw new BadRequestException('name is required');
    const rows = await this.db.post<any[]>('governance_councils', token, {
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      unit_id: input.unit_id ?? null,
      created_by: a.id,
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Council was not created');
    await this.audit(token, orgId, a.id, 'council.created', 'governance_council', row.id);
    return row;
  }

  async councilMembers(token: string, councilId: string) {
    return this.db.get('governance_council_members', token, `?select=*&council_id=eq.${councilId}&order=created_at.asc`);
  }

  async addCouncilMember(token: string, councilId: string, membershipId: string, input: { member_role?: string; is_voting_member?: boolean }) {
    const rows = await this.db.post<any[]>('governance_council_members', token, {
      council_id: councilId,
      membership_id: membershipId,
      member_role: input.member_role || 'MEMBER',
      is_voting_member: input.is_voting_member !== false,
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Council member was not added');
    return row;
  }

  async meetings(token: string, councilId: string) {
    return this.db.get('governance_meetings', token, `?select=*&council_id=eq.${councilId}&order=scheduled_at.desc`);
  }

  async createMeeting(token: string, councilId: string, input: { title: string; description?: string; scheduled_at: string }) {
    const a = await this.actor(token);
    if (!input.title?.trim() || !input.scheduled_at) throw new BadRequestException('title and scheduled_at are required');
    const rows = await this.db.post<any[]>('governance_meetings', token, {
      council_id: councilId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      scheduled_at: input.scheduled_at,
      host_user_id: a.id,
      created_by: a.id,
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting was not created');

    await this.db.post('governance_meeting_participants', token, {
      meeting_id: row.id,
      user_id: a.id,
      participant_role: 'HOST',
      is_host: true,
      status: 'ACCEPTED',
    });

    const channelName = `zion:meeting:${row.id}`;
    const mediaRoom = await this.media.createRoom({ meetingId: row.id, channelName });
    await this.db.post('governance_meeting_rooms', token, {
      meeting_id: row.id,
      channel_name: channelName,
      provider: mediaRoom.provider,
      provider_room_id: mediaRoom.providerRoomId ?? null,
      provider_room_url: mediaRoom.providerRoomUrl ?? null,
      status: 'READY',
    });
    return row;
  }

  async iceConfig(token: string, meetingId: string) {
    const a = await this.actor(token);
    const room = (await this.db.get<any[]>('governance_meeting_rooms', token,
      `?select=status,locked,provider&meeting_id=eq.${meetingId}&limit=1`))[0];
    if (!room) throw new BadRequestException('Meeting room was not initialized');
    if (room.status !== 'OPEN') throw new BadRequestException('Meeting room is not open');
    if (room.locked) throw new BadRequestException('Meeting room is locked');

    const participant = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=id,status&meeting_id=eq.${meetingId}&user_id=eq.${a.id}&limit=1`))[0];
    if (!participant || !['INVITED','ACCEPTED','PRESENT'].includes(participant.status)) {
      throw new BadRequestException('You are not an active meeting participant');
    }

    const iceServers = getIceServers();
    return {
      transport: iceServers.some((server) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        return urls.some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:'));
      }) ? 'P2P_TURN' : 'P2P_STUN_ONLY',
      provider: room.provider,
      iceServers,
    };
  }

  async room(token: string, meetingId: string) {
    const rows = await this.db.get<any[]>('governance_meeting_rooms', token,
      `?select=*&meeting_id=eq.${meetingId}&limit=1`);
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting room was not initialized');
    return row;
  }

  async openRoom(token: string, meetingId: string) {
    const room = (await this.db.get<any[]>('governance_meeting_rooms', token,
      `?select=provider_room_id&meeting_id=eq.${meetingId}&limit=1`))[0];
    await this.media.openRoom({ meetingId, providerRoomId: room?.provider_room_id ?? null });
    const rows = await this.db.patch<any[]>('governance_meeting_rooms', token,
      { status: 'OPEN' }, `?meeting_id=eq.${meetingId}`);
    return rows[0];
  }

  async closeRoom(token: string, meetingId: string) {
    const room = (await this.db.get<any[]>('governance_meeting_rooms', token,
      `?select=provider_room_id&meeting_id=eq.${meetingId}&limit=1`))[0];
    await this.media.closeRoom({ meetingId, providerRoomId: room?.provider_room_id ?? null });
    const rows = await this.db.patch<any[]>('governance_meeting_rooms', token,
      { status: 'CLOSED' }, `?meeting_id=eq.${meetingId}`);
    return rows[0];
  }

  async roomEvents(token: string, meetingId: string) {
    return this.db.get('governance_meeting_room_events', token,
      `?select=*&meeting_id=eq.${meetingId}&order=created_at.asc`);
  }

  async recordRoomEvent(token: string, meetingId: string, eventType: string, payload: unknown = {}) {
    const a = await this.actor(token);
    const allowed = [
      'ROOM_OPENED','ROOM_CLOSED','JOINED','LEFT','MUTED','UNMUTED','CAMERA_ON','CAMERA_OFF',
      'HAND_RAISED','HAND_LOWERED','SCREEN_SHARE_STARTED','SCREEN_SHARE_STOPPED',
      'MODERATOR_ACTION',
    ];
    if (!allowed.includes(eventType)) throw new BadRequestException('Invalid room event');
    const rows = await this.db.post<any[]>('governance_meeting_room_events', token, {
      meeting_id: meetingId, user_id: a.id, event_type: eventType, payload,
    });
    return rows[0];
  }

  async controls(token: string, meetingId: string) {
    return this.db.get('governance_meeting_participant_controls', token,
      `?select=*&meeting_id=eq.${meetingId}&order=created_at.asc`);
  }

  async setSelfControl(token: string, meetingId: string, input: {
    mic_muted?: boolean;
    camera_enabled?: boolean;
    screen_sharing?: boolean;
    hand_raised?: boolean;
  }) {
    const a = await this.actor(token);
    const participant = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=id,status,participant_role&meeting_id=eq.${meetingId}&user_id=eq.${a.id}&limit=1`))[0];
    if (!participant || !['INVITED','ACCEPTED','PRESENT'].includes(participant.status)) {
      throw new BadRequestException('You are not an active meeting participant');
    }
    const body: Record<string, unknown> = {
      meeting_id: meetingId,
      user_id: a.id,
      updated_by: a.id,
    };
    for (const key of ['mic_muted','camera_enabled','screen_sharing','hand_raised'] as const) {
      if (input[key] !== undefined) body[key] = input[key];
    }
    const rows = await this.db.upsert<any[]>('governance_meeting_participant_controls', token, body,
      '?on_conflict=meeting_id,user_id');
    return rows[0];
  }

  async moderateParticipant(token: string, meetingId: string, targetUserId: string, input: {
    mic_muted?: boolean;
    camera_enabled?: boolean;
    removed?: boolean;
  }) {
    const a = await this.actor(token);
    const actor = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=id,participant_role,status&meeting_id=eq.${meetingId}&user_id=eq.${a.id}&limit=1`))[0];
    if (!actor || !['HOST','MODERATOR'].includes(actor.participant_role) ||
        !['INVITED','ACCEPTED','PRESENT'].includes(actor.status)) {
      throw new BadRequestException('Host or moderator privileges are required');
    }
    const target = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=id,status&meeting_id=eq.${meetingId}&user_id=eq.${targetUserId}&limit=1`))[0];
    if (!target) throw new BadRequestException('Target participant was not found');

    const body: Record<string, unknown> = {
      meeting_id: meetingId,
      user_id: targetUserId,
      updated_by: a.id,
    };
    for (const key of ['mic_muted','camera_enabled','removed'] as const) {
      if (input[key] !== undefined) body[key] = input[key];
    }
    const rows = await this.db.upsert<any[]>('governance_meeting_participant_controls', token, body,
      '?on_conflict=meeting_id,user_id');

    if (input.removed === true) {
      await this.db.patch('governance_meeting_participants', token,
        { status: 'REMOVED', left_at: new Date().toISOString() },
        `?meeting_id=eq.${meetingId}&user_id=eq.${targetUserId}`);
    }

    await this.recordRoomEvent(token, meetingId, 'MODERATOR_ACTION', {
      action: 'PARTICIPANT_CONTROL',
      target_user_id: targetUserId,
      changes: input,
    });
    return rows[0];
  }

  async lockRoom(token: string, meetingId: string, locked: boolean, reason?: string) {
    const a = await this.actor(token);
    const actor = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=participant_role,status&meeting_id=eq.${meetingId}&user_id=eq.${a.id}&limit=1`))[0];
    if (!actor || !['HOST','MODERATOR'].includes(actor.participant_role) ||
        !['INVITED','ACCEPTED','PRESENT'].includes(actor.status)) {
      throw new BadRequestException('Host or moderator privileges are required');
    }
    const rows = await this.db.patch<any[]>('governance_meeting_rooms', token,
      { locked, lock_reason: locked ? (reason?.trim() || 'Room locked by moderator') : null },
      `?meeting_id=eq.${meetingId}`);
    await this.recordRoomEvent(token, meetingId, 'MODERATOR_ACTION', {
      action: locked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED',
      reason: locked ? (reason?.trim() || null) : null,
    });
    return rows[0];
  }

  async prepareRecording(token: string, meetingId: string, enabled: boolean) {
    const a = await this.actor(token);
    const actor = (await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=participant_role,status&meeting_id=eq.${meetingId}&user_id=eq.${a.id}&limit=1`))[0];
    if (!actor || !['HOST','MODERATOR'].includes(actor.participant_role) ||
        !['INVITED','ACCEPTED','PRESENT'].includes(actor.status)) {
      throw new BadRequestException('Host or moderator privileges are required');
    }
    const rows = await this.db.patch<any[]>('governance_meeting_rooms', token,
      { recording_enabled: enabled, recording_status: enabled ? 'READY' : 'DISABLED' },
      `?meeting_id=eq.${meetingId}`);
    await this.recordRoomEvent(token, meetingId, 'MODERATOR_ACTION', {
      action: enabled ? 'RECORDING_PREPARED' : 'RECORDING_DISABLED',
    });
    return rows[0];
  }

  async chat(token: string, meetingId: string) {
    return this.db.get('governance_meeting_chat_messages', token,
      `?select=*&meeting_id=eq.${meetingId}&is_deleted=eq.false&order=created_at.asc`);
  }

  async sendChat(token: string, meetingId: string, body: string) {
    const a = await this.actor(token);
    if (!body?.trim()) throw new BadRequestException('body is required');
    const rows = await this.db.post<any[]>('governance_meeting_chat_messages', token, {
      meeting_id: meetingId, user_id: a.id, body: body.trim(),
    });
    return rows[0];
  }

  async startMeeting(token: string, meetingId: string) {
    const a = await this.actor(token);
    const rows = await this.db.patch<any[]>('governance_meetings', token, {
      status: 'LIVE',
      started_at: new Date().toISOString(),
      host_user_id: a.id,
    }, `?id=eq.${meetingId}`);
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting was not started');
    await this.openRoom(token, meetingId);
    return row;
  }

  async endMeeting(token: string, meetingId: string) {
    const rows = await this.db.patch<any[]>('governance_meetings', token, {
      status: 'ENDED',
      ended_at: new Date().toISOString(),
    }, `?id=eq.${meetingId}`);
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting was not ended');
    await this.closeRoom(token, meetingId);
    return row;
  }

  async participants(token: string, meetingId: string) {
    return this.db.get('governance_meeting_participants', token, `?select=*&meeting_id=eq.${meetingId}&order=created_at.asc`);
  }

  async addParticipant(token: string, meetingId: string, input: {
    user_id: string;
    council_member_id?: string | null;
    participant_role?: string;
    is_host?: boolean;
  }) {
    if (!input.user_id) throw new BadRequestException('user_id is required');
    const rows = await this.db.post<any[]>('governance_meeting_participants', token, {
      meeting_id: meetingId,
      user_id: input.user_id,
      council_member_id: input.council_member_id ?? null,
      participant_role: input.participant_role || 'PARTICIPANT',
      is_host: input.is_host === true,
      status: 'INVITED',
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Participant was not added');
    return row;
  }

  async setPresence(token: string, meetingId: string, status: 'ACCEPTED' | 'PRESENT' | 'LEFT' | 'DECLINED') {
    const a = await this.actor(token);
    const patch: Record<string, unknown> = { status };
    if (status === 'PRESENT') patch.joined_at = new Date().toISOString();
    if (status === 'LEFT') patch.left_at = new Date().toISOString();
    const rows = await this.db.patch<any[]>('governance_meeting_participants', token, patch,
      `?meeting_id=eq.${meetingId}&user_id=eq.${a.id}`);
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting participant record was not found');
    return row;
  }

  async agenda(token: string, meetingId: string) {
    return this.db.get('governance_agenda_items', token, `?select=*&meeting_id=eq.${meetingId}&order=position.asc`);
  }

  async addAgenda(token: string, meetingId: string, input: { title: string; position: number; description?: string; item_type?: string }) {
    if (!input.title?.trim()) throw new BadRequestException('title is required');
    const rows = await this.db.post<any[]>('governance_agenda_items', token, {
      meeting_id: meetingId,
      title: input.title.trim(),
      position: input.position,
      description: input.description?.trim() || null,
      item_type: input.item_type || 'DISCUSSION',
    });
    return rows[0];
  }

  async motions(token: string, meetingId: string) {
    return this.db.get('governance_motions', token, `?select=*&meeting_id=eq.${meetingId}&order=created_at.asc`);
  }

  async createMotion(token: string, meetingId: string, input: { title: string; body: string; agenda_item_id?: string | null }) {
    if (!input.title?.trim() || !input.body?.trim()) throw new BadRequestException('title and body are required');
    const rows = await this.db.post<any[]>('governance_motions', token, {
      meeting_id: meetingId,
      title: input.title.trim(),
      body: input.body.trim(),
      agenda_item_id: input.agenda_item_id ?? null,
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Motion was not created');
    return row;
  }

  async vote(token: string, motionId: string, councilMemberId: string, choice: string) {
    const allowed = ['YES', 'NO', 'ABSTAIN'];
    if (!allowed.includes(choice)) throw new BadRequestException('Invalid vote choice');
    const rows = await this.db.post<any[]>('governance_votes', token, {
      motion_id: motionId,
      council_member_id: councilMemberId,
      choice,
    });
    const row = rows[0];
    if (!row) throw new BadRequestException('Vote was not recorded');
    return row;
  }

  async decide(token: string, motionId: string, outcome: string) {
    const a = await this.actor(token);
    if (!['APPROVED', 'REJECTED', 'NO_DECISION'].includes(outcome)) {
      throw new BadRequestException('Invalid decision outcome');
    }

    const motion = (await this.db.get<any[]>('governance_motions', token,
      `?select=id,meeting_id&id=eq.${motionId}`))[0];
    if (!motion) throw new BadRequestException('Motion was not found');

    const meeting = (await this.db.get<any[]>('governance_meetings', token,
      `?select=id,council_id& id=eq.${motion.meeting_id}`))[0];
    if (!meeting) throw new BadRequestException('Meeting was not found');

    const council = (await this.db.get<any[]>('governance_councils', token,
      `?select=id,quorum_type,quorum_value&id=eq.${meeting.council_id}`))[0];
    if (!council) throw new BadRequestException('Council was not found');

    const members = await this.db.get<any[]>('governance_council_members', token,
      `?select=id,is_voting_member&council_id=eq.${meeting.council_id}&is_voting_member=eq.true&status=eq.ACTIVE`);
    const participants = await this.db.get<any[]>('governance_meeting_participants', token,
      `?select=council_member_id,status&meeting_id=eq.${meeting.id}&status=in.(PRESENT,LEFT)`);

    const eligible = members.length;
    const presentIds = new Set(participants.map(p => p.council_member_id).filter(Boolean));
    const present = members.filter(m => presentIds.has(m.id)).length;

    let quorumMet = false;
    if (council.quorum_type === 'FIXED_COUNT') {
      quorumMet = present >= Number(council.quorum_value ?? 0);
    } else {
      quorumMet = eligible > 0 && (present / eligible) * 100 >= Number(council.quorum_value ?? 50);
    }

    const votes = await this.db.get<any[]>('governance_votes', token, `?select=choice&motion_id=eq.${motionId}`);
    const yes = votes.filter(v => v.choice === 'YES').length;
    const no = votes.filter(v => v.choice === 'NO').length;
    const abstain = votes.filter(v => v.choice === 'ABSTAIN').length;

    const rows = await this.db.post<any[]>('governance_decisions', token, {
      motion_id: motionId,
      outcome: quorumMet ? outcome : 'NO_DECISION',
      yes_count: yes,
      no_count: no,
      abstain_count: abstain,
      quorum_met: quorumMet,
      decided_by: a.id,
    });
    return rows[0];
  }

  async minutes(token: string, meetingId: string) {
    return this.db.get('governance_minutes', token, `?select=*&meeting_id=eq.${meetingId}&limit=1`);
  }

  async saveMinutes(token: string, meetingId: string, content: string, status = 'DRAFT') {
    const a = await this.actor(token);
    if (!content?.trim()) throw new BadRequestException('content is required');
    const existing = (await this.db.get<any[]>('governance_minutes', token, `?select=id&meeting_id=eq.${meetingId}&limit=1`))[0];
    if (existing) {
      const rows = await this.db.patch<any[]>('governance_minutes', token, { content, status },
        `?id=eq.${existing.id}`);
      return rows[0];
    }
    const rows = await this.db.post<any[]>('governance_minutes', token, {
      meeting_id: meetingId,
      content,
      status,
      created_by: a.id,
    });
    return rows[0];
  }
}
