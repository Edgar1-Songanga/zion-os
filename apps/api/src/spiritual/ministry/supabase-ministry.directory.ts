import { Injectable } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import type {
  MinistryDirectoryPort,
  MinistryProfileInput,
  MinistryProgramInput,
  MinistryProgramRecord,
  MinistryProgramStatus,
  MinistryRecord,
} from './ministry.types';

@Injectable()
export class SupabaseMinistryDirectory implements MinistryDirectoryPort {
  private readonly db = new SupabaseRestClient();

  async create(
    organizationId: string,
    input: {
      name: string;
      createdBy: string;
      department: string;
      philosophy: string;
      description: string;
      coverImageUrl?: string | null;
      focusAreas?: string[];
      ageRange?: string | null;
      officialUrl?: string | null;
      sourceLabel?: string | null;
    },
    token?: string,
  ): Promise<MinistryRecord | null> {
    if (!token) return null;
    const rows = await this.db.post<any[]>('ministries', token, {
      organization_id: organizationId,
      name: input.name,
      created_by: input.createdBy,
      department: input.department,
      philosophy: input.philosophy,
      description: input.description,
      ...(input.coverImageUrl !== undefined ? { cover_image_url: input.coverImageUrl } : {}),
      ...(input.focusAreas !== undefined ? { focus_areas: input.focusAreas } : {}),
      ...(input.ageRange !== undefined ? { age_range: input.ageRange } : {}),
      ...(input.officialUrl !== undefined ? { official_url: input.officialUrl } : {}),
      ...(input.sourceLabel !== undefined ? { source_label: input.sourceLabel } : {}),
    });
    return rows[0] ? this.hydrate(rows[0], token) : null;
  }

  async update(id: string, input: MinistryProfileInput, token?: string): Promise<MinistryRecord | null> {
    if (!token) return null;
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) body.name = input.name;
    if (input.department !== undefined) body.department = input.department;
    if (input.description !== undefined) body.description = input.description;
    if (input.philosophy !== undefined) body.philosophy = input.philosophy;
    if (input.coverImageUrl !== undefined) body.cover_image_url = input.coverImageUrl;
    if (input.focusAreas !== undefined) body.focus_areas = input.focusAreas;
    if (input.ageRange !== undefined) body.age_range = input.ageRange;
    if (input.officialUrl !== undefined) body.official_url = input.officialUrl;
    if (input.sourceLabel !== undefined) body.source_label = input.sourceLabel;

    const rows = await this.db.patch<any[]>(
      'ministries',
      token,
      body,
      `?id=eq.${encodeURIComponent(id)}`,
    );
    return rows[0] ? this.hydrate(rows[0], token) : null;
  }

  async createProgram(ministryId: string, input: MinistryProgramInput, token?: string): Promise<MinistryProgramRecord | null> {
    if (!token) return null;
    const rows = await this.db.post<any[]>('ministry_programs', token, {
      ministry_id: ministryId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'PLANNED',
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    });
    return rows[0] ? this.mapProgram(rows[0]) : null;
  }

  async updateProgram(
    ministryId: string,
    programId: string,
    input: MinistryProgramInput,
    token?: string,
  ): Promise<MinistryProgramRecord | null> {
    if (!token) return null;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.status !== undefined) body.status = input.status;
    if (input.startDate !== undefined) body.start_date = input.startDate;
    if (input.endDate !== undefined) body.end_date = input.endDate;
    const rows = await this.db.patch<any[]>(
      'ministry_programs',
      token,
      body,
      `?id=eq.${encodeURIComponent(programId)}&ministry_id=eq.${encodeURIComponent(ministryId)}`,
    );
    return rows[0] ? this.mapProgram(rows[0]) : null;
  }

  async getById(id: string, token?: string): Promise<MinistryRecord | null> {
    if (!token) return null;
    const rows = await this.db.get<any[]>('ministries', token, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? this.hydrate(rows[0], token) : null;
  }

  async listByOrganization(organizationId: string, token?: string): Promise<MinistryRecord[]> {
    if (!token) return [];
    const rows = await this.db.get<any[]>(
      'ministries',
      token,
      `?select=*&organization_id=eq.${encodeURIComponent(organizationId)}&order=name.asc`,
    );
    return Promise.all(rows.map((row) => this.hydrate(row, token)));
  }

  async listByLeader(userId: string, token?: string, department?: string): Promise<MinistryRecord[]> {
    if (!token) return [];
    const assignments = await this.db.get<Array<{ ministry_id: string }>>(
      "ministry_leaders",
      token,
      `?select=ministry_id&user_id=eq.${encodeURIComponent(userId)}&verified=eq.true&order=created_at.asc`,
    );
    let ministryIds = [...new Set(assignments.map((assignment) => assignment.ministry_id).filter(Boolean))];
    if (department && ministryIds.length > 0) {
      const scoped = await this.db.get<Array<{ id: string }>>(
        "ministries",
        token,
        `?select=id&id=in.(${ministryIds.join(",")})&department=eq.${encodeURIComponent(department)}`,
      );
      const allowedIds = new Set(scoped.map((row) => row.id));
      ministryIds = ministryIds.filter((id) => allowedIds.has(id));
    }
    const records = await Promise.all(ministryIds.map((id) => this.getById(id, token)));
    return records.filter((record): record is MinistryRecord => Boolean(record));
  }

  async assignLeader(ministryId: string, userId: string, role: string, token: string) {
    const ministryRows = await this.db.get<Array<{ id: string; organization_id: string; department: string }>>(
      "ministries", token, "?select=id,organization_id,department&id=eq." + encodeURIComponent(ministryId) + "&limit=1",
    );
    const ministry = ministryRows[0];
    if (!ministry) return null;
    const memberships = await this.db.get<Array<{ id: string; roles?: { key?: string } | Array<{ key?: string }> }>>(
      "organization_memberships", token,
      "?select=id,roles(key)&organization_id=eq." + encodeURIComponent(ministry.organization_id) + "&user_id=eq." + encodeURIComponent(userId) + "&status=eq.ACTIVE&limit=1",
    );
    const membership = memberships[0];
    const assignedRole = Array.isArray(membership?.roles) ? membership.roles[0] : membership?.roles;
    const requiredRoles = ministry.department === "stewardship"
      ? ["stewardship_manager"]
      : ministry.department === "youth"
        ? ["youth_director", "ministry_leader", "department_leader", "pastor"]
        : ["ministry_leader", "department_leader", "pastor"];
    if (!membership || !requiredRoles.includes(assignedRole?.key ?? "")) return null;
    const rows = await this.db.upsert<Array<{ id: string; user_id: string; role: string; verified: boolean }>>(
      "ministry_leaders", token,
      { ministry_id: ministryId, user_id: userId, role, verified: true },
      "?on_conflict=ministry_id,user_id",
    );
    return rows[0] ?? null;
  }

  async removeLeader(ministryId: string, leaderId: string, token: string): Promise<boolean> {
    const removed = await this.db.delete<Array<{ id: string }>>(
      "ministry_leaders", token,
      "?id=eq." + encodeURIComponent(leaderId) + "&ministry_id=eq." + encodeURIComponent(ministryId),
    );
    return removed.length > 0;
  }
  private async hydrate(row: any, token: string): Promise<MinistryRecord> {
    const [organization, leaders, programs, reports, members] = await Promise.all([
      this.db.get<any[]>('organizations', token, `?select=name,organization_type&id=eq.${encodeURIComponent(row.organization_id)}&limit=1`),
      this.db.get<any[]>('ministry_leaders', token, `?select=id,user_id,role,verified&ministry_id=eq.${encodeURIComponent(row.id)}&order=created_at.asc`),
      this.db.get<any[]>('ministry_programs', token, `?select=id,name,description,status,start_date,end_date&ministry_id=eq.${encodeURIComponent(row.id)}&order=name.asc`),
      this.db.get<any[]>('ministry_reports', token, `?select=id,title,status,submitted_at&ministry_id=eq.${encodeURIComponent(row.id)}&order=submitted_at.desc`),
      this.db.get<any[]>('ministry_members', token, `?select=user_id&ministry_id=eq.${encodeURIComponent(row.id)}&status=eq.ACTIVE`),
    ]);

    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description ?? '',
      philosophy: row.philosophy ?? '',
      status: String(row.status).toLowerCase() === 'active' ? 'active' : 'inactive',
      coverImageUrl: row.cover_image_url ?? null,
      focusAreas: Array.isArray(row.focus_areas) ? row.focus_areas.filter((value: unknown): value is string => typeof value === 'string') : [],
      ageRange: row.age_range ?? null,
      officialUrl: row.official_url ?? null,
      sourceLabel: row.source_label ?? null,
      createdAt: row.created_at,
      department: row.department,
      organization: organization[0] ? { church: organization[0].name, district: row.department } : {},
      leadership: leaders.map((leader) => ({ ...leader, userId: leader.user_id, name: leader.user_id })),
      programs: programs.map((program) => this.mapProgram(program)),
      reports,
      metrics: {
        members: members.length,
        leaders: leaders.length,
        programs: programs.length,
        // These indicators require attendance history, member snapshots, and recorded outcomes.
        // Until those source records exist, null means unavailable rather than a false zero.
        participation: null,
        growth: null,
        impact: null,
      },
    };
  }

  private mapProgram(row: any): MinistryProgramRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      status: row.status as MinistryProgramStatus,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
    };
  }
}
