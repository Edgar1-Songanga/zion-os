import { BadRequestException, Injectable, Inject, Optional } from '@nestjs/common';
import type { MinistryDirectoryPort, MinistryProfileInput, MinistryRecord } from './ministry.types';

export const MINISTRY_DIRECTORY = Symbol('MINISTRY_DIRECTORY');

type MinistryRequestInput = {
  organization_id?: string;
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
    if (!organizationId) {
      throw new BadRequestException('organization_id and name are required');
    }

    const profile = this.normalizeProfile(input, true);
    return (
      (await this.directory?.create?.(
        organizationId,
        {
          name,
          department: profile.department ?? 'MINISTRY',
          philosophy: profile.philosophy ?? '',
          description: profile.description ?? '',
          coverImageUrl: profile.coverImageUrl,
          focusAreas: profile.focusAreas,
          ageRange: profile.ageRange,
          officialUrl: profile.officialUrl,
          sourceLabel: profile.sourceLabel,
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
    return (await this.directory?.update?.(id, profile, token)) ?? null;
  }

  async get(id: string, token?: string): Promise<MinistryRecord | null> {
    if (!this.isUuid(id)) throw new BadRequestException('A valid ministry id is required.');
    return this.directory ? this.directory.getById(id, token) : null;
  }

  async list(organizationId: string, token?: string): Promise<MinistryRecord[]> {
    if (!this.isUuid(organizationId)) throw new BadRequestException('A valid organization id is required.');
    return this.directory ? this.directory.listByOrganization(organizationId, token) : [];
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
      result.focusAreas = input.focus_areas.map((value, index) =>
        this.requiredText(value, `focus_areas[${index}]`, 1, 120),
      );
      result.focusAreas = [...new Set(result.focusAreas)];
    }
    if (input.age_range !== undefined) {
      result.ageRange = this.optionalText(input.age_range ?? undefined, 'age_range', 120) ?? null;
    }
    if (input.source_label !== undefined) {
      result.sourceLabel = this.optionalText(input.source_label ?? undefined, 'source_label', 200) ?? null;
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
