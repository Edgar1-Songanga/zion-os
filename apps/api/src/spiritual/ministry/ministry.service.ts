import { BadRequestException, Injectable, Inject, Optional, NotFoundException } from '@nestjs/common';
import type {
  MinistryDirectoryPort,
  MinistryProfileInput,
  MinistryProgramInput,
  MinistryProgramRecord,
  MinistryProgramStatus,
  MinistryRecord,
} from './ministry.types';

export const MINISTRY_DIRECTORY = Symbol('MINISTRY_DIRECTORY');

type MinistryRequestInput = {
  organization_id?: string;
  created_by?: string;
  name?: string;
  department?: string;
  philosophy?: string;
  description?: string;
  cover_image_url?: string | null;
  focus_areas?: unknown;
  age_range?: string | null;
  official_url?: string | null;
  source_label?: string | null;
};

type MinistryProgramRequestInput = {
  name?: unknown;
  description?: unknown;
  status?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};

@Injectable()
export class SpiritualMinistryService {
  constructor(
    @Optional()
    @Inject(MINISTRY_DIRECTORY)
    private readonly directory?: MinistryDirectoryPort,
  ) {}

  async create(token: string, input: MinistryRequestInput): Promise<MinistryRecord | null> {
    const organizationId = input.organization_id?.trim();
    const name = this.requiredText(input.name, 'name', 2, 160);
    if (!organizationId || !input.created_by || !this.isUuid(input.created_by)) {
      throw new BadRequestException('organization_id and authenticated creator are required');
    }

    const profile = this.normalizeProfile(input, true);
    return (
      (await this.directory?.create?.(
        organizationId,
        {
          name,
          createdBy: input.created_by,
          department: profile.department ?? 'MINISTRY',
          philosophy: profile.philosophy ?? '',
          description: profile.description ?? '',
          ...(profile.coverImageUrl !== undefined ? { coverImageUrl: profile.coverImageUrl } : {}),
          ...(profile.focusAreas !== undefined ? { focusAreas: profile.focusAreas } : {}),
          ...(profile.ageRange !== undefined ? { ageRange: profile.ageRange } : {}),
          ...(profile.officialUrl !== undefined ? { officialUrl: profile.officialUrl } : {}),
          ...(profile.sourceLabel !== undefined ? { sourceLabel: profile.sourceLabel } : {}),
        },
        token,
      )) ?? null
    );
  }

  async update(id: string, token: string, input: MinistryRequestInput): Promise<MinistryRecord | null> {
    if (!this.isUuid(id)) throw new BadRequestException('A valid ministry id is required.');
    const profile = this.normalizeProfile(input, false);
    if (Object.keys(profile).length === 0) {
      throw new BadRequestException('At least one ministry profile field must be provided.');
    }
    const updated = await this.directory?.update?.(id, profile, token);
    if (!updated) {
      throw new NotFoundException('Ministry not found or you do not have permission to edit this profile.');
    }
    return updated;
  }

  async get(id: string, token?: string): Promise<MinistryRecord | null> {
    if (!this.isUuid(id)) throw new BadRequestException('A valid ministry id is required.');
    return this.directory ? this.directory.getById(id, token) : null;
  }

  async list(organizationId: string, token?: string): Promise<MinistryRecord[]> {
    if (!this.isUuid(organizationId)) throw new BadRequestException('A valid organization id is required.');
    return this.directory ? this.directory.listByOrganization(organizationId, token) : [];
  }

  async createProgram(ministryId: string, token: string, input: MinistryProgramRequestInput): Promise<MinistryProgramRecord | null> {
    if (!this.isUuid(ministryId)) throw new BadRequestException('A valid ministry id is required.');
    const program = this.normalizeProgram(input, true);
    const created = await this.directory?.createProgram?.(ministryId, program, token);
    if (!created) throw new NotFoundException('Ministry not found or you do not have permission to add a program.');
    return created;
  }

  async updateProgram(
    ministryId: string,
    programId: string,
    token: string,
    input: MinistryProgramRequestInput,
  ): Promise<MinistryProgramRecord | null> {
    if (!this.isUuid(ministryId) || !this.isUuid(programId)) {
      throw new BadRequestException('Valid ministry and program ids are required.');
    }
    const program = this.normalizeProgram(input, false);
    const updated = await this.directory?.updateProgram?.(ministryId, programId, program, token);
    if (!updated) throw new NotFoundException('Program not found or you do not have permission to edit it.');
    return updated;
  }

  private normalizeProgram(input: MinistryProgramRequestInput, creating: boolean): MinistryProgramInput {
    const result: MinistryProgramInput = {};
    if (!creating && (input.start_date !== undefined) !== (input.end_date !== undefined)) {
      throw new BadRequestException('start_date and end_date must be updated together.');
    }
    if (creating || input.name !== undefined) result.name = this.requiredText(input.name, 'name', 2, 160);
    if (creating || input.description !== undefined) {
      result.description = input.description === null ? null : (this.optionalText(input.description, 'description', 2000) ?? null);
    }
    if (creating || input.status !== undefined) {
      const status = input.status ?? 'PLANNED';
      if (status !== 'PLANNED' && status !== 'ACTIVE' && status !== 'COMPLETED') {
        throw new BadRequestException('status must be PLANNED, ACTIVE, or COMPLETED.');
      }
      result.status = status as MinistryProgramStatus;
    }
    if (creating || input.start_date !== undefined) result.startDate = this.optionalDate(input.start_date, 'start_date');
    if (creating || input.end_date !== undefined) result.endDate = this.optionalDate(input.end_date, 'end_date');
    if (!creating && Object.keys(result).length === 0) {
      throw new BadRequestException('At least one program field must be provided.');
    }
    if (result.startDate && result.endDate && result.endDate < result.startDate) {
      throw new BadRequestException('end_date must be on or after start_date.');
    }
    return result;
  }

  private optionalDate(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
      throw new BadRequestException(`${field} must be a valid YYYY-MM-DD date.`);
    }
    try {
      if (new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
        throw new Error('invalid date');
      }
    } catch {
      throw new BadRequestException(`${field} must be a valid YYYY-MM-DD date.`);
    }
    return value;
  }

  private normalizeProfile(input: MinistryRequestInput, creating: boolean): MinistryProfileInput {
    const result: MinistryProfileInput = {};

    if (creating || input.name !== undefined) {
      result.name = this.requiredText(input.name, 'name', 2, 160);
    }
    if (creating || input.department !== undefined) {
      result.department = this.optionalText(input.department, 'department', 160) ?? 'MINISTRY';
    }
    if (creating || input.description !== undefined) {
      result.description = this.optionalText(input.description, 'description', 2000) ?? '';
    }
    if (creating || input.philosophy !== undefined) {
      result.philosophy = this.optionalText(input.philosophy, 'philosophy', 2000) ?? '';
    }
    if (input.cover_image_url !== undefined) {
      result.coverImageUrl = this.httpsUrl(input.cover_image_url, 'cover_image_url');
    }
    if (input.official_url !== undefined) {
      result.officialUrl = this.httpsUrl(input.official_url, 'official_url');
    }
    if (input.focus_areas !== undefined) {
      if (!Array.isArray(input.focus_areas) || input.focus_areas.length > 20) {
        throw new BadRequestException('focus_areas must be an array with at most 20 entries.');
      }
      result.focusAreas = [...new Set(input.focus_areas.map((value, index) =>
        this.requiredText(value, `focus_areas[${index}]`, 1, 120),
      ))];
    }
    if (input.age_range !== undefined) {
      result.ageRange = input.age_range === null ? null : (this.optionalText(input.age_range, 'age_range', 120) ?? null);
    }
    if (input.source_label !== undefined) {
      result.sourceLabel = input.source_label === null ? null : (this.optionalText(input.source_label, 'source_label', 200) ?? null);
    }
    return result;
  }

  private requiredText(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
    const normalized = value.trim();
    if (normalized.length < min || normalized.length > max) {
      throw new BadRequestException(`${field} must contain between ${min} and ${max} characters.`);
    }
    return normalized;
  }

  private optionalText(value: unknown, field: string, max: number): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
    const normalized = value.trim();
    if (normalized.length > max) throw new BadRequestException(`${field} must be at most ${max} characters.`);
    return normalized || undefined;
  }

  private httpsUrl(value: string | null, field: string): string | null {
    if (value === null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new BadRequestException(`${field} must be a valid HTTPS URL.`);
    }
    if (parsed.protocol !== 'https:') throw new BadRequestException(`${field} must use HTTPS.`);
    return parsed.toString();
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
