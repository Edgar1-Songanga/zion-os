import { Injectable } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import type { MinistryDirectoryPort, MinistryRecord } from './ministry.types';

@Injectable()
export class SupabaseMinistryDirectory implements MinistryDirectoryPort {
  private readonly db = new SupabaseRestClient();

  async create(organizationId: string, input: { name: string; department: string; philosophy: string; description: string }, token?: string): Promise<MinistryRecord | null> {
    if (!token) return null;
    const rows = await this.db.post<any[]>('ministries', token, {
      organization_id: organizationId,
      name: input.name,
      department: input.department,
      philosophy: input.philosophy,
      description: input.description,
    });
    return rows[0] ? this.hydrate(rows[0], token) : null;
  }

  async getById(id: string, token?: string): Promise<MinistryRecord | null> {
    if (!token) return null;
    const rows = await this.db.get<any[]>('ministries', token, `?select=*&id=eq.${id}&limit=1`);
    return rows[0] ? this.hydrate(rows[0], token) : null;
  }

  async listByOrganization(organizationId: string, token?: string): Promise<MinistryRecord[]> {
    if (!token) return [];
    const rows = await this.db.get<any[]>('ministries', token, `?select=*&organization_id=eq.${organizationId}&order=name.asc`);
    return Promise.all(rows.map((row) => this.hydrate(row, token)));
  }

  private async hydrate(row: any, token: string): Promise<MinistryRecord> {
    const [organization, leaders, programs, reports, members] = await Promise.all([
      this.db.get<any[]>('organizations', token, `?select=name,organization_type& id=eq.${row.organization_id}&limit=1`.replace('& id', '&id')),
      this.db.get<any[]>('ministry_leaders', token, `?select=id,user_id,role,verified&ministry_id=eq.${row.id}&order=created_at.asc`),
      this.db.get<any[]>('ministry_programs', token, `?select=id,name,description,status,start_date,end_date&ministry_id=eq.${row.id}&order=name.asc`),
      this.db.get<any[]>('ministry_reports', token, `?select=id,title,status,submitted_at&ministry_id=eq.${row.id}&order=submitted_at.desc`),
      this.db.get<any[]>('ministry_members', token, `?select=user_id&ministry_id=eq.${row.id}&status=eq.ACTIVE`),
    ]);
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description ?? '',
      philosophy: row.philosophy ?? '',
      status: String(row.status).toLowerCase() === 'active' ? 'active' : 'inactive',
      createdAt: row.created_at,
      department: row.department,
      organization: organization[0] ? { church: organization[0].name, district: row.department } : {},
      leadership: leaders.map((leader) => ({ ...leader, name: leader.user_id })),
      programs,
      reports,
      metrics: {
        members: members.length,
        leaders: leaders.length,
        programs: programs.length,
        participation: 0,
        growth: 0,
        impact: 0,
      },
    };
  }
}
