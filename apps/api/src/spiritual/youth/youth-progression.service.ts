import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const PROGRAMS = ['adventurers', 'pathfinders', 'ambassadors', 'young-adults', 'public-campus-ministries'] as const;
type ProgramId = typeof PROGRAMS[number];
type CatalogKind = 'CLASS' | 'SPECIALTY';
type ProgressStatus = 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'RETURNED';
type InvestitureStatus = 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';

@Injectable()
export class YouthProgressionService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async listCatalog(token: string, organizationId: string, programId?: string, kind?: string) {
    const organization = this.uuid(organizationId, 'organization_id');
    const filters = [
      `organization_id=eq.${encodeURIComponent(organization)}`,
      'order=program_id.asc,kind.asc,name.asc',
    ];
    if (programId !== undefined) filters.unshift(`program_id=eq.${encodeURIComponent(this.program(programId))}`);
    if (kind !== undefined) filters.unshift(`kind=eq.${encodeURIComponent(this.kind(kind))}`);
    return this.db.get<any[]>('youth_achievement_catalog', token, `?select=*&${filters.join('&')}`);
  }

  async createCatalog(token: string, organizationId: string, input: any) {
    const actor = await this.identity.getCurrentUser(token);
    const organization = this.uuid(organizationId, 'organization_id');
    const programId = this.program(input.program_id);
    const kind = this.kind(input.kind);
    const code = this.text(input.code, 'code', 2, 60).toUpperCase().replace(/\s+/g, '-');
    const name = this.text(input.name, 'name', 2, 160);
    const description = this.optionalText(input.description, 'description', 2000) ?? '';
    const level = this.optionalText(input.level, 'level', 120) ?? '';
    const prerequisites = this.prerequisites(input.prerequisites);
    const officialReferenceUrl = this.httpsUrl(input.official_reference_url, 'official_reference_url');
    const rows = await this.db.post<any[]>('youth_achievement_catalog', token, {
      organization_id: organization, program_id: programId, kind, code, name, description, level,
      prerequisites, official_reference_url: officialReferenceUrl, is_active: input.is_active ?? true,
      created_by: actor.id,
    });
    if (!rows[0]) throw new BadRequestException('Curriculum item was not created.');
    return rows[0];
  }

  async updateCatalog(token: string, id: string, input: any) {
    const catalogId = this.uuid(id, 'catalog item id');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.code !== undefined) patch.code = this.text(input.code, 'code', 2, 60).toUpperCase().replace(/\s+/g, '-');
    if (input.name !== undefined) patch.name = this.text(input.name, 'name', 2, 160);
    if (input.description !== undefined) patch.description = this.optionalText(input.description, 'description', 2000) ?? '';
    if (input.level !== undefined) patch.level = this.optionalText(input.level, 'level', 120) ?? '';
    if (input.prerequisites !== undefined) patch.prerequisites = this.prerequisites(input.prerequisites);
    if (input.official_reference_url !== undefined) patch.official_reference_url = this.httpsUrl(input.official_reference_url, 'official_reference_url');
    if (input.is_active !== undefined) {
      if (typeof input.is_active !== 'boolean') throw new BadRequestException('is_active must be boolean.');
      patch.is_active = input.is_active;
    }
    if (Object.keys(patch).length === 1) throw new BadRequestException('At least one catalog field must be provided.');
    const rows = await this.db.patch<any[]>('youth_achievement_catalog', token, patch, `?id=eq.${encodeURIComponent(catalogId)}`);
    if (!rows[0]) throw new NotFoundException('Curriculum item not found or access denied.');
    return rows[0];
  }

  async listProgress(token: string, clubId: string) {
    const club = this.uuid(clubId, 'club id');
    return this.db.get<any[]>(
      'youth_member_progress', token,
      `?select=*,catalog:youth_achievement_catalog(id,kind,code,name,description,level,program_id)&club_id=eq.${encodeURIComponent(club)}&order=updated_at.desc`,
    );
  }

  async assignProgress(token: string, clubId: string, input: any) {
    const actor = await this.identity.getCurrentUser(token);
    const club = await this.getClub(token, clubId);
    const userId = this.uuid(input.user_id, 'user_id');
    const catalogId = this.uuid(input.catalog_item_id, 'catalog_item_id');
    await this.assertActiveClubMember(token, club.id, userId);
    const catalog = await this.getCatalog(token, catalogId);
    if (catalog.organization_id !== club.organization_id || catalog.program_id !== club.program_id) {
      throw new BadRequestException('Curriculum item must belong to the same organization and youth program as the club.');
    }
    if (catalog.is_active !== true) throw new BadRequestException('Inactive curriculum items cannot be assigned.');
    const rows = await this.db.upsert<any[]>('youth_member_progress', token, {
      organization_id: club.organization_id, club_id: club.id, user_id: userId, catalog_item_id: catalog.id,
    }, '?on_conflict=club_id,user_id,catalog_item_id');
    if (!rows[0]) throw new BadRequestException('Progress record was not created.');
    return rows[0];
  }

  async updateProgress(token: string, id: string, input: any) {
    const actor = await this.identity.getCurrentUser(token);
    const progressId = this.uuid(id, 'progress id');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) {
      if (!['IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'RETURNED'].includes(input.status)) {
        throw new BadRequestException('status must be IN_PROGRESS, COMPLETED, VERIFIED, or RETURNED.');
      }
      patch.status = input.status as ProgressStatus;
      if (input.status === 'COMPLETED') patch.completed_at = new Date().toISOString();
      if (input.status === 'VERIFIED') {
        patch.completed_at = new Date().toISOString();
        patch.verified_by = actor.id;
        patch.verified_at = new Date().toISOString();
      }
      if (input.status === 'RETURNED' || input.status === 'IN_PROGRESS') {
        patch.completed_at = null;
        patch.verified_by = null;
        patch.verified_at = null;
      }
    }
    if (input.evidence_url !== undefined) patch.evidence_url = this.httpsUrl(input.evidence_url, 'evidence_url');
    if (input.notes !== undefined) patch.notes = this.optionalText(input.notes, 'notes', 2000) ?? '';
    if (Object.keys(patch).length === 1) throw new BadRequestException('At least one progress field must be provided.');
    const rows = await this.db.patch<any[]>('youth_member_progress', token, patch, `?id=eq.${encodeURIComponent(progressId)}`);
    if (!rows[0]) throw new NotFoundException('Progress record not found or access denied.');
    return rows[0];
  }

  async listInvestitures(token: string, clubId: string) {
    const club = this.uuid(clubId, 'club id');
    return this.db.get<any[]>(
      'youth_investitures', token,
      `?select=*,class:youth_achievement_catalog(id,code,name,level,program_id)&club_id=eq.${encodeURIComponent(club)}&order=scheduled_date.desc,created_at.desc`,
    );
  }

  async createInvestiture(token: string, clubId: string, input: any) {
    const actor = await this.identity.getCurrentUser(token);
    const club = await this.getClub(token, clubId);
    const userId = this.uuid(input.user_id, 'user_id');
    const classId = this.uuid(input.class_catalog_id, 'class_catalog_id');
    await this.assertActiveClubMember(token, club.id, userId);
    const catalog = await this.getCatalog(token, classId);
    if (catalog.kind !== 'CLASS' || catalog.organization_id !== club.organization_id || catalog.program_id !== club.program_id) {
      throw new BadRequestException('Investiture must reference an active class from the same organization and youth program as the club.');
    }
    if (catalog.is_active !== true) throw new BadRequestException('Inactive classes cannot be scheduled for investiture.');
    const scheduledDate = this.date(input.scheduled_date);
    const location = this.optionalText(input.location, 'location', 240) ?? '';
    const notes = this.optionalText(input.notes, 'notes', 2000) ?? '';
    const officiatedBy = input.officiated_by ? this.uuid(input.officiated_by, 'officiated_by') : null;
    const rows = await this.db.post<any[]>('youth_investitures', token, {
      organization_id: club.organization_id, club_id: club.id, user_id: userId,
      class_catalog_id: catalog.id, scheduled_date: scheduledDate, location, notes,
      officiated_by: officiatedBy, status: 'REQUESTED', created_by: actor.id,
    });
    if (!rows[0]) throw new BadRequestException('Investiture request was not created.');
    return rows[0];
  }

  async updateInvestiture(token: string, id: string, input: any) {
    const investitureId = this.uuid(id, 'investiture id');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) {
      if (!['REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED'].includes(input.status)) {
        throw new BadRequestException('Invalid investiture status.');
      }
      patch.status = input.status as InvestitureStatus;
      patch.completed_at = input.status === 'COMPLETED' ? new Date().toISOString() : null;
    }
    if (input.scheduled_date !== undefined) patch.scheduled_date = this.date(input.scheduled_date);
    if (input.location !== undefined) patch.location = this.optionalText(input.location, 'location', 240) ?? '';
    if (input.notes !== undefined) patch.notes = this.optionalText(input.notes, 'notes', 2000) ?? '';
    if (input.officiated_by !== undefined) patch.officiated_by = input.officiated_by === null ? null : this.uuid(input.officiated_by, 'officiated_by');
    if (Object.keys(patch).length === 1) throw new BadRequestException('At least one investiture field must be provided.');
    const rows = await this.db.patch<any[]>('youth_investitures', token, patch, `?id=eq.${encodeURIComponent(investitureId)}`);
    if (!rows[0]) throw new NotFoundException('Investiture not found or access denied.');
    return rows[0];
  }

  private async getClub(token: string, id: string) {
    const clubId = this.uuid(id, 'club id');
    const rows = await this.db.get<any[]>('youth_clubs', token, `?select=id,organization_id,program_id,status&id=eq.${encodeURIComponent(clubId)}&limit=1`);
    if (!rows[0]) throw new NotFoundException('Youth club not found or access denied.');
    if (rows[0].status !== 'ACTIVE') throw new BadRequestException('Operations are not available for an inactive club.');
    return rows[0] as { id: string; organization_id: string; program_id: ProgramId; status: string };
  }

  private async getCatalog(token: string, id: string) {
    const catalogId = this.uuid(id, 'catalog item id');
    const rows = await this.db.get<any[]>('youth_achievement_catalog', token, `?select=*&id=eq.${encodeURIComponent(catalogId)}&limit=1`);
    if (!rows[0]) throw new NotFoundException('Curriculum item not found or access denied.');
    return rows[0];
  }

  private async assertActiveClubMember(token: string, clubId: string, userId: string) {
    const rows = await this.db.get<any[]>(
      'youth_club_members', token,
      `?select=user_id&club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&limit=1`,
    );
    if (!rows[0]) throw new BadRequestException('The person must be an active member of this club.');
  }

  private program(value: unknown): ProgramId {
    if (typeof value !== 'string' || !PROGRAMS.includes(value as ProgramId)) throw new BadRequestException('Unsupported youth program.');
    return value as ProgramId;
  }

  private kind(value: unknown): CatalogKind {
    if (value !== 'CLASS' && value !== 'SPECIALTY') throw new BadRequestException('kind must be CLASS or SPECIALTY.');
    return value;
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

  private prerequisites(value: unknown): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== 'string' || item.trim().length > 160)) {
      throw new BadRequestException('prerequisites must be an array of up to 50 text values.');
    }
    return value.map((item: string) => item.trim()).filter(Boolean);
  }

  private httpsUrl(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be a valid HTTPS URL.`);
    let parsed: URL;
    try { parsed = new URL(value.trim()); } catch { throw new BadRequestException(`${field} must be a valid HTTPS URL.`); }
    if (parsed.protocol !== 'https:') throw new BadRequestException(`${field} must use HTTPS.`);
    return parsed.toString();
  }

  private date(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
      throw new BadRequestException('scheduled_date must use YYYY-MM-DD.');
    }
    return value;
  }

  private uuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
    return value;
  }
}
