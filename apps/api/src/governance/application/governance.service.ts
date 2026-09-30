import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class GovernanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

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
    await this.db.post('governance_meeting_rooms', token, {
      meeting_id: row.id,
      channel_name: `zion:meeting:${row.id}`,
      provider: 'EXTERNAL',
      status: 'READY',
    });
    return row;
  }

  async room(token: string, meetingId: string) {
    const rows = await this.db.get<any[]>('governance_meeting_rooms', token,
      `?select=*&meeting_id=eq.${meetingId}&limit=1`);
    const row = rows[0];
    if (!row) throw new BadRequestException('Meeting room was not initialized');
    return row;
  }

  async openRoom(token: string, meetingId: string) {
    const rows = await this.db.patch<any[]>('governance_meeting_rooms', token,
      { status: 'OPEN' }, `?meeting_id=eq.${meetingId}`);
    return rows[0];
  }

  async closeRoom(token: string, meetingId: string) {
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
      'JOINED','LEFT','MUTED','UNMUTED','CAMERA_ON','CAMERA_OFF',
      'HAND_RAISED','HAND_LOWERED','SCREEN_SHARE_STARTED','SCREEN_SHARE_STOPPED',
      'MODERATOR_ACTION',
    ];
    if (!allowed.includes(eventType)) throw new BadRequestException('Invalid room event');
    const rows = await this.db.post<any[]>('governance_meeting_room_events', token, {
      meeting_id: meetingId, user_id: a.id, event_type: eventType, payload,
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
