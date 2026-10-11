import { Injectable } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import type {
  YouthClubDirectoryPort,
  YouthClubInput,
  YouthClubLeaderRecord,
  YouthClubMemberRecord,
  YouthClubRecord,
  YouthClubStatus,
  YouthProgramId,
} from './youth-club.types';

@Injectable()
export class SupabaseYouthClubDirectory implements YouthClubDirectoryPort {
  private readonly db = new SupabaseRestClient();

  async create(input: Required<Pick<YouthClubInput, 'organizationId' | 'name' | 'programId'>> & YouthClubInput, token: string): Promise<YouthClubRecord | null> {
    const rows = await this.db.post<any[]>('youth_clubs', token, {
      organization_id: input.organizationId, ministry_id: input.ministryId ?? null, name: input.name,
      program_id: input.programId, motto: input.motto ?? '', description: input.description ?? '',
      logo_url: input.logoUrl ?? null, cover_image_url: input.coverImageUrl ?? null, status: input.status ?? 'ACTIVE',
    });
    return rows[0] ? this.mapClub(rows[0]) : null;
  }

  async getById(id: string, token: string): Promise<YouthClubRecord | null> {
    const rows = await this.db.get<any[]>('youth_clubs', token, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? this.mapClub(rows[0]) : null;
  }

  async listByOrganization(organizationId: string, token: string): Promise<YouthClubRecord[]> {
    const rows = await this.db.get<any[]>('youth_clubs', token, `?select=*&organization_id=eq.${encodeURIComponent(organizationId)}&order=program_id.asc,name.asc`);
    return rows.map((row) => this.mapClub(row));
  }

  async update(id: string, input: YouthClubInput, token: string): Promise<YouthClubRecord | null> {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.ministryId !== undefined) body.ministry_id = input.ministryId;
    if (input.name !== undefined) body.name = input.name;
    if (input.programId !== undefined) body.program_id = input.programId;
    if (input.motto !== undefined) body.motto = input.motto;
    if (input.description !== undefined) body.description = input.description;
    if (input.logoUrl !== undefined) body.logo_url = input.logoUrl;
    if (input.coverImageUrl !== undefined) body.cover_image_url = input.coverImageUrl;
    if (input.status !== undefined) body.status = input.status;
    const rows = await this.db.patch<any[]>('youth_clubs', token, body, `?id=eq.${encodeURIComponent(id)}`);
    return rows[0] ? this.mapClub(rows[0]) : null;
  }

  async listMembers(clubId: string, token: string): Promise<YouthClubMemberRecord[]> {
    const rows = await this.db.get<any[]>('youth_club_members', token, `?select=club_id,user_id,status,joined_at&club_id=eq.${encodeURIComponent(clubId)}&order=joined_at.asc`);
    return rows.map((row) => this.mapMember(row));
  }

  async addMember(clubId: string, userId: string, token: string): Promise<YouthClubMemberRecord | null> {
    await this.assertActiveOrganizationMember(clubId, userId, token);
    const rows = await this.db.upsert<any[]>('youth_club_members', token, {
      club_id: clubId, user_id: userId, status: 'ACTIVE',
    }, '?on_conflict=club_id,user_id');
    return rows[0] ? this.mapMember(rows[0]) : null;
  }

  async updateMemberStatus(clubId: string, userId: string, status: YouthClubStatus, token: string): Promise<YouthClubMemberRecord | null> {
    const rows = await this.db.patch<any[]>('youth_club_members', token, { status }, `?club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}`);
    return rows[0] ? this.mapMember(rows[0]) : null;
  }

  async removeMember(clubId: string, userId: string, token: string): Promise<boolean> {
    const rows = await this.db.delete<any[]>('youth_club_members', token, `?club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}`);
    return rows.length > 0;
  }

  async listLeaders(clubId: string, token: string): Promise<YouthClubLeaderRecord[]> {
    const rows = await this.db.get<any[]>('youth_club_leaders', token, `?select=club_id,user_id,role,verified,created_at&club_id=eq.${encodeURIComponent(clubId)}&order=created_at.asc`);
    return rows.map((row) => this.mapLeader(row));
  }

  async assignLeader(clubId: string, userId: string, role: string, token: string): Promise<YouthClubLeaderRecord | null> {
    await this.assertActiveOrganizationMember(clubId, userId, token);
    const rows = await this.db.upsert<any[]>('youth_club_leaders', token, {
      club_id: clubId, user_id: userId, role, verified: false,
    }, '?on_conflict=club_id,user_id');
    return rows[0] ? this.mapLeader(rows[0]) : null;
  }

  async removeLeader(clubId: string, userId: string, token: string): Promise<boolean> {
    const rows = await this.db.delete<any[]>('youth_club_leaders', token, `?club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}`);
    return rows.length > 0;
  }

  private async assertActiveOrganizationMember(clubId: string, userId: string, token: string): Promise<void> {
    const clubs = await this.db.get<Array<{ organization_id: string }>>('youth_clubs', token, `?select=organization_id&id=eq.${encodeURIComponent(clubId)}&limit=1`);
    const club = clubs[0];
    if (!club) throw new Error('Youth club not found or access denied.');
    const memberships = await this.db.get<Array<{ user_id: string }>>(
      'organization_memberships', token,
      `?select=user_id&organization_id=eq.${encodeURIComponent(club.organization_id)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&limit=1`,
    );
    if (!memberships[0]) throw new Error('The selected person must be an active member of this organization.');
  }

  private mapClub(row: any): YouthClubRecord {
    return {
      id: row.id, organizationId: row.organization_id, ministryId: row.ministry_id ?? null,
      name: row.name, programId: row.program_id as YouthProgramId, motto: row.motto ?? '',
      description: row.description ?? '', logoUrl: row.logo_url ?? null, coverImageUrl: row.cover_image_url ?? null,
      status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE', createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private mapMember(row: any): YouthClubMemberRecord {
    return { clubId: row.club_id, userId: row.user_id, status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE', joinedAt: row.joined_at };
  }

  private mapLeader(row: any): YouthClubLeaderRecord {
    return { clubId: row.club_id, userId: row.user_id, role: row.role, verified: Boolean(row.verified), createdAt: row.created_at };
  }
}
