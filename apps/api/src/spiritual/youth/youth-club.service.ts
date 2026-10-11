import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import type {
  YouthClubDirectoryPort,
  YouthClubInput,
  YouthClubLeaderRecord,
  YouthClubMemberRecord,
  YouthClubRecord,
  YouthClubStatus,
  YouthProgramId,
} from './youth-club.types';

export const YOUTH_CLUB_DIRECTORY = Symbol('YOUTH_CLUB_DIRECTORY');

const PROGRAM_IDS: readonly YouthProgramId[] = [
  'adventurers',
  'pathfinders',
  'ambassadors',
  'young-adults',
  'public-campus-ministries',
];

@Injectable()
export class YouthClubService {
  constructor(@Inject(YOUTH_CLUB_DIRECTORY) private readonly directory: YouthClubDirectoryPort) {}

  async create(token: string, input: YouthClubInput): Promise<YouthClubRecord | null> {
    const organizationId = this.uuid(input.organizationId, 'organization_id');
    const name = this.requiredText(input.name, 'name', 2, 160);
    const programId = this.programId(input.programId);
    const normalized = this.normalize(input, true);
    return this.directory.create({ ...normalized, organizationId, name, programId }, token);
  }

  async get(id: string, token: string): Promise<YouthClubRecord | null> {
    return this.directory.getById(this.uuid(id, 'club id'), token);
  }

  async list(organizationId: string, token: string): Promise<YouthClubRecord[]> {
    return this.directory.listByOrganization(this.uuid(organizationId, 'organization_id'), token);
  }

  async update(id: string, token: string, input: YouthClubInput): Promise<YouthClubRecord | null> {
    const clubId = this.uuid(id, 'club id');
    const normalized = this.normalize(input, false);
    if (Object.keys(normalized).length === 0) throw new BadRequestException('At least one youth club field must be provided.');
    return this.directory.update(clubId, normalized, token);
  }

  async listMembers(clubId: string, token: string): Promise<YouthClubMemberRecord[]> {
    return this.directory.listMembers(this.uuid(clubId, 'club id'), token);
  }

  async addMember(clubId: string, userId: string, token: string): Promise<YouthClubMemberRecord | null> {
    return this.directory.addMember(this.uuid(clubId, 'club id'), this.uuid(userId, 'user_id'), token);
  }

  async updateMemberStatus(clubId: string, userId: string, status: unknown, token: string): Promise<YouthClubMemberRecord | null> {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new BadRequestException('status must be ACTIVE or INACTIVE.');
    return this.directory.updateMemberStatus(
      this.uuid(clubId, 'club id'),
      this.uuid(userId, 'user_id'),
      status as YouthClubStatus,
      token,
    );
  }

  async removeMember(clubId: string, userId: string, token: string): Promise<void> {
    const removed = await this.directory.removeMember(this.uuid(clubId, 'club id'), this.uuid(userId, 'user_id'), token);
    if (!removed) throw new NotFoundException('Youth club membership not found or access denied.');
  }

  async listLeaders(clubId: string, token: string): Promise<YouthClubLeaderRecord[]> {
    return this.directory.listLeaders(this.uuid(clubId, 'club id'), token);
  }

  async assignLeader(clubId: string, userId: string, role: unknown, token: string): Promise<YouthClubLeaderRecord | null> {
    return this.directory.assignLeader(
      this.uuid(clubId, 'club id'),
      this.uuid(userId, 'user_id'),
      this.requiredText(role, 'role', 2, 120),
      token,
    );
  }

  async removeLeader(clubId: string, userId: string, token: string): Promise<void> {
    const removed = await this.directory.removeLeader(this.uuid(clubId, 'club id'), this.uuid(userId, 'user_id'), token);
    if (!removed) throw new NotFoundException('Youth club leadership assignment not found or access denied.');
  }

  private normalize(input: YouthClubInput, creating: boolean): YouthClubInput {
    const result: YouthClubInput = {};
    if (creating || input.name !== undefined) result.name = this.requiredText(input.name, 'name', 2, 160);
    if (creating || input.programId !== undefined) result.programId = this.programId(input.programId);
    if (input.ministryId !== undefined) result.ministryId = input.ministryId === null ? null : this.uuid(input.ministryId, 'ministry_id');
    if (creating || input.motto !== undefined) result.motto = this.optionalText(input.motto, 'motto', 160) ?? '';
    if (creating || input.description !== undefined) result.description = this.optionalText(input.description, 'description', 2000) ?? '';
    if (input.logoUrl !== undefined) result.logoUrl = this.httpsUrl(input.logoUrl, 'logo_url');
    if (input.coverImageUrl !== undefined) result.coverImageUrl = this.httpsUrl(input.coverImageUrl, 'cover_image_url');
    if (input.status !== undefined) {
      if (input.status !== 'ACTIVE' && input.status !== 'INACTIVE') throw new BadRequestException('status must be ACTIVE or INACTIVE.');
      result.status = input.status;
    }
    return result;
  }

  private programId(value: unknown): YouthProgramId {
    if (typeof value !== 'string' || !PROGRAM_IDS.includes(value as YouthProgramId)) {
      throw new BadRequestException('program_id must identify one of the five configured Adventist youth programs.');
    }
    return value as YouthProgramId;
  }

  private requiredText(value: unknown, field: string, min: number, max: number): string {
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

  private httpsUrl(value: string | null, field: string): string | null {
    if (value === null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    let parsed: URL;
    try { parsed = new URL(normalized); } catch { throw new BadRequestException(`${field} must be a valid HTTPS URL.`); }
    if (parsed.protocol !== 'https:') throw new BadRequestException(`${field} must use HTTPS.`);
    return parsed.toString();
  }

  private uuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
    return value;
  }
}
