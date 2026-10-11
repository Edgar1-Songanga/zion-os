import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const ACTIVITY_TYPES = ['meeting', 'camp', 'congress', 'investiture', 'training', 'mission', 'community_service'] as const;
const ACTIVITY_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
const PARTICIPATION_STATUSES = ['REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED'] as const;

@Injectable()
export class YouthActivityService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async listClubActivities(token: string, clubId: string) {
    const club = this.uuid(clubId, 'club id');
    return this.db.get<any[]>(
      'youth_club_activities', token,
      `?select=*&club_id=eq.${encodeURIComponent(club)}&order=starts_at.desc`,
    );
  }

  async createActivity(token: string, clubId: string, input: any) {
    const actor = await this.identity.getCurrentUser(token);
    const club = await this.getClub(token, clubId);
    const title = this.text(input.title, 'title', 2, 180);
    const description = this.optionalText(input.description, 'description', 4000) ?? '';
    const activityType = this.activityType(input.activity_type);
    const startsAt = this.timestamp(input.starts_at, 'starts_at', true);
    const endsAt = this.timestamp(input.ends_at, 'ends_at', false);
    if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
      throw new BadRequestException('ends_at must be equal to or later than starts_at.');
    }
    const location = this.optionalText(input.location, 'location', 240) ?? '';
    const leaderUserId = input.leader_user_id ? this.uuid(input.leader_user_id, 'leader_user_id') : null;
    if (leaderUserId) await this.assertClubLeader(token, club.id, leaderUserId);
    const rows = await this.db.post<any[]>('youth_club_activities', token, {
      organization_id: club.organization_id, club_id: club.id, title, description,
      activity_type: activityType, starts_at: startsAt, ends_at: endsAt,
      location, leader_user_id: leaderUserId, status: 'PLANNED', created_by: actor.id,
    });
    if (!rows[0]) throw new BadRequestException('Activity was not created.');
    return rows[0];
  }

  async updateActivity(token: string, id: string, input: any) {
    const activityId = this.uuid(id, 'activity id');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = this.text(input.title, 'title', 2, 180);
    if (input.description !== undefined) patch.description = this.optionalText(input.description, 'description', 4000) ?? '';
    if (input.activity_type !== undefined) patch.activity_type = this.activityType(input.activity_type);
    if (input.starts_at !== undefined) patch.starts_at = this.timestamp(input.starts_at, 'starts_at', true);
    if (input.ends_at !== undefined) patch.ends_at = this.timestamp(input.ends_at, 'ends_at', false);
    if (input.location !== undefined) patch.location = this.optionalText(input.location, 'location', 240) ?? '';
    if (input.leader_user_id !== undefined) {
      patch.leader_user_id = input.leader_user_id === null ? null : this.uuid(input.leader_user_id, 'leader_user_id');
    }
    if (input.status !== undefined) {
      if (!ACTIVITY_STATUSES.includes(input.status)) throw new BadRequestException('Invalid activity status.');
      patch.status = input.status;
    }
    if (Object.keys(patch).length === 1) throw new BadRequestException('At least one activity field must be provided.');
    const current = await this.db.get<any[]>('youth_club_activities', token, `?select=id,club_id,starts_at,ends_at&id=eq.${encodeURIComponent(activityId)}&limit=1`);
    if (!current[0]) throw new NotFoundException('Activity not found or access denied.');
    const startsAt = typeof patch.starts_at === 'string' ? patch.starts_at : current[0].starts_at;
    const endsAt = Object.prototype.hasOwnProperty.call(patch, 'ends_at') ? patch.ends_at : current[0].ends_at;
    if (endsAt && Date.parse(String(endsAt)) < Date.parse(String(startsAt))) {
      throw new BadRequestException('ends_at must be equal to or later than starts_at.');
    }
    if (typeof patch.leader_user_id === 'string') await this.assertClubLeader(token, current[0].club_id, patch.leader_user_id);
    const rows = await this.db.patch<any[]>('youth_club_activities', token, patch, `?id=eq.${encodeURIComponent(activityId)}`);
    if (!rows[0]) throw new NotFoundException('Activity not found or access denied.');
    return rows[0];
  }

  async listParticipants(token: string, activityId: string) {
    const id = this.uuid(activityId, 'activity id');
    return this.db.get<any[]>(
      'youth_activity_participants', token,
      `?select=*&activity_id=eq.${encodeURIComponent(id)}&order=registered_at.asc`,
    );
  }

  async registerParticipant(token: string, activityId: string, requestedUserId?: string) {
    const actor = await this.identity.getCurrentUser(token);
    const id = this.uuid(activityId, 'activity id');
    const activities = await this.db.get<any[]>(
      'youth_club_activities', token,
      `?select=id,club_id,status&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const activity = activities[0];
    if (!activity) throw new NotFoundException('Activity not found or access denied.');
    if (activity.status === 'CANCELLED' || activity.status === 'COMPLETED') {
      throw new BadRequestException('Registration is closed for this activity.');
    }
    const userId = requestedUserId ? this.uuid(requestedUserId, 'user_id') : actor.id;
    await this.assertActiveClubMember(token, activity.club_id, userId);
    const existing = await this.db.get<any[]>(
      'youth_activity_participants', token,
      `?select=*&activity_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    if (existing[0]) return existing[0];
    const rows = await this.db.post<any[]>('youth_activity_participants', token, {
      activity_id: id, club_id: activity.club_id, user_id: userId, status: 'REGISTERED',
    });
    if (!rows[0]) throw new BadRequestException('Participant was not registered.');

  }

  async updateParticipation(token: string, activityId: string, userId: string, input: any) {
    const activity = this.uuid(activityId, 'activity id');
    const user = this.uuid(userId, 'user_id');
    if (!PARTICIPATION_STATUSES.includes(input.status)) throw new BadRequestException('Invalid participation status.');
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
      checked_in_at: input.status === 'ATTENDED' ? new Date().toISOString() : null,
    };
    if (input.notes !== undefined) patch.notes = this.optionalText(input.notes, 'notes', 1000) ?? '';
    const rows = await this.db.patch<any[]>(
      'youth_activity_participants', token, patch,
      `?activity_id=eq.${encodeURIComponent(activity)}&user_id=eq.${encodeURIComponent(user)}`,
    );
    if (!rows[0]) throw new NotFoundException('Participant record not found or access denied.');
    return rows[0];
  }

  async report(token: string, organizationId: string) {
    const org = this.uuid(organizationId, 'organization_id');
    return this.db.rpc<any>('youth_ministry_operational_report', token, { p_organization_id: org });
  }

  private async getClub(token: string, id: string) {
    const clubId = this.uuid(id, 'club id');
    const rows = await this.db.get<any[]>(
      'youth_clubs', token,
      `?select=id,organization_id,program_id,status&id=eq.${encodeURIComponent(clubId)}&limit=1`,
    );
    if (!rows[0]) throw new NotFoundException('Youth club not found or access denied.');
    if (rows[0].status !== 'ACTIVE') throw new BadRequestException('Activities cannot be created for an inactive club.');
    return rows[0] as { id: string; organization_id: string; program_id: string; status: string };
  }

  private async assertClubLeader(token: string, clubId: string, userId: string) {
    const rows = await this.db.get<any[]>(
      'youth_club_leaders', token,
      `?select=user_id&club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    if (!rows[0]) throw new BadRequestException('The assigned activity lead must be an appointed leader of this club.');
  }

  private async assertActiveClubMember(token: string, clubId: string, userId: string) {
    const rows = await this.db.get<any[]>(
      'youth_club_members', token,
      `?select=user_id&club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&limit=1`,
    );
    if (!rows[0]) throw new BadRequestException('The participant must be an active member of this club.');
  }

  private activityType(value: unknown) {
    if (typeof value !== 'string' || !ACTIVITY_TYPES.includes(value as typeof ACTIVITY_TYPES[number])) {
      throw new BadRequestException('Unsupported activity_type.');
    }
    return value;
  }

  private timestamp(value: unknown, field: string, required: boolean): string | null {
    if (value === undefined || value === null || value === '') {
      if (required) throw new BadRequestException(`${field} is required.`);
      return null;
    }
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new BadRequestException(`${field} must be a valid date/time.`);
    return new Date(value).toISOString();
  }

  private text(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
    const normalized = value.trim();
    if (normalized.length < min || normalized.length > max) throw new BadRequestException(`${field} must contain between ${min} and ${max} characters.`);
    return normalized;
  }

  private optionalText(value: unknown, field: string, max: number): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
    const normalized = value.trim();
    if (normalized.length > max) throw new BadRequestException(`${field} must be at most ${max} characters.`);
    return normalized || undefined;
  }

  private uuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
    return value;
  }
}
