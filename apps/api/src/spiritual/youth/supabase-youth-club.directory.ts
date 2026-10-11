import { Injectable } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import type { YouthClubDirectoryPort, YouthClubInput, YouthClubRecord, YouthProgramId } from './youth-club.types';

@Injectable()
export class SupabaseYouthClubDirectory implements YouthClubDirectoryPort {
  private readonly db = new SupabaseRestClient();

  async create(
    input: Required<Pick<YouthClubInput, 'organizationId' | 'name' | 'programId'>> & YouthClubInput,
    token: string,
  ): Promise<YouthClubRecord | null> {
    const rows = await this.db.post<any[]>('youth_clubs', token, {
      organization_id: input.organizationId,
      ministry_id: input.ministryId ?? null,
      name: input.name,
      program_id: input.programId,
      motto: input.motto ?? '',
      description: input.description ?? '',
      logo_url: input.logoUrl ?? null,
      cover_image_url: input.coverImageUrl ?? null,
      status: input.status ?? 'ACTIVE',
    });
    return rows[0] ? this.map(rows[0]) : null;
  }

  async getById(id: string, token: string): Promise<YouthClubRecord | null> {
    const rows = await this.db.get<any[]>('youth_clubs', token, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? this.map(rows[0]) : null;
  }

  async listByOrganization(organizationId: string, token: string): Promise<YouthClubRecord[]> {
    const rows = await this.db.get<any[]>(
      'youth_clubs',
      token,
      `?select=*&organization_id=eq.${encodeURIComponent(organizationId)}&order=program_id.asc,name.asc`,
    );
    return rows.map((row) => this.map(row));
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

    const rows = await this.db.patch<any[]>(
      'youth_clubs',
      token,
      body,
      `?id=eq.${encodeURIComponent(id)}`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  private map(row: any): YouthClubRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      ministryId: row.ministry_id ?? null,
      name: row.name,
      programId: row.program_id as YouthProgramId,
      motto: row.motto ?? '',
      description: row.description ?? '',
      logoUrl: row.logo_url ?? null,
      coverImageUrl: row.cover_image_url ?? null,
      status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
