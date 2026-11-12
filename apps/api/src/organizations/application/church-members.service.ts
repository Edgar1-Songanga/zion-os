import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const STATUSES = ['ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE', 'REMOVED'] as const;
const ARCHIVE_STATUSES = ['DECEASED', 'REMOVED'] as const;
const GENDERS = ['FEMALE', 'MALE', 'UNSPECIFIED'] as const;

type MemberRecord = {
  id: string;
  organization_id: string;
  member_number: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  baptism_date: string | null;
  membership_status: string;
  joined_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
};

type MemberInput = {
  member_number?: string | null;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  baptism_date?: string | null;
  membership_status?: string;
  joined_on?: string | null;
  notes?: string | null;
};

@Injectable()
export class ChurchMembersService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get<MemberRecord[]>(
      'church_member_records',
      accessToken,
      `?select=id,organization_id,member_number,first_name,last_name,birth_date,gender,phone,email,address,baptism_date,membership_status,joined_on,notes,created_at,updated_at,row_version&organization_id=eq.${organizationId}&order=last_name.asc,first_name.asc&limit=100`,
    );
  }

  async create(accessToken: string, organizationId: string, input: MemberInput) {
    this.assertUuid(organizationId, 'organizationId');
    const user = await this.identity.getCurrentUser(accessToken);
    const values = this.normalize(input, true);
    if (!values.first_name || !values.last_name) {
      throw new BadRequestException('first_name and last_name are required.');
    }
    const created = await this.db.post<MemberRecord[]>(
      'church_member_records',
      accessToken,
      {
        organization_id: organizationId,
        ...values,
        created_by: user.id,
        updated_by: user.id,
      },
    );
    if (!created[0]) throw new BadRequestException('The member record was not created.');
    return created[0];
  }

  async syncOffline(
    accessToken: string,
    organizationId: string,
    operationId: string,
    entityId: string,
    action: 'create' | 'update',
    expectedVersion: number | null,
    input: MemberInput,
  ) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(operationId, 'operationId');
    this.assertUuid(entityId, 'entityId');
    const user = await this.identity.getCurrentUser(accessToken);
    const values = this.normalize(input, action === 'create');
    if (action === 'create' && (!values.first_name || !values.last_name)) {
      throw new BadRequestException('first_name and last_name are required.');
    }
    if (action === 'update' && (!Number.isSafeInteger(expectedVersion) || (expectedVersion ?? 0) < 1)) {
      throw new BadRequestException('A valid expectedVersion is required for offline updates.');
    }
    if (action === 'create' && expectedVersion !== null) {
      throw new BadRequestException('Create operations cannot include expectedVersion.');
    }

    const result = await this.db.rpc<Record<string, unknown>>(
      'sync_church_member_offline',
      accessToken,
      {
        p_operation_id: operationId,
        p_organization_id: organizationId,
        p_entity_id: entityId,
        p_action: action,
        p_expected_version: expectedVersion,
        p_payload: values,
      },
    );
    if (result && result.sync_conflict === true) {
      throw new ConflictException({
        message: 'Este registo foi alterado noutro dispositivo. Revê a versão actual antes de sincronizar.',
        current: result.current ?? null,
      });
    }
    return { ...result, synced_by: user.id };
  }

  async update(accessToken: string, organizationId: string, memberId: string, input: MemberInput) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(memberId, 'memberId');
    const user = await this.identity.getCurrentUser(accessToken);
    const values = this.normalize(input, false);
    if (Object.keys(values).length === 0) {
      throw new BadRequestException('Provide at least one supported field to update.');
    }
    const updated = await this.db.patch<MemberRecord[]>(
      'church_member_records',
      accessToken,
      { ...values, updated_by: user.id },
      `?id=eq.${memberId}&organization_id=eq.${organizationId}`,
    );
    if (!updated[0]) throw new NotFoundException('Member record not found or not accessible.');
    return updated[0];
  }

  async listByStatus(accessToken: string, status: string) {
    await this.identity.getCurrentUser(accessToken);
    if (!(ARCHIVE_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException('Only DECEASED or REMOVED records can be listed globally.');
    }
    return this.db.get<MemberRecord[]>(
      'church_member_records',
      accessToken,
      `?select=id,organization_id,member_number,first_name,last_name,birth_date,gender,membership_status,joined_on,updated_at&membership_status=eq.${status}&order=last_name.asc,first_name.asc&limit=500`,
    );
  }

  async remove(accessToken: string, organizationId: string, memberId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(memberId, 'memberId');
    const user = await this.identity.getCurrentUser(accessToken);
    const updated = await this.db.patch<MemberRecord[]>(
      'church_member_records',
      accessToken,
      { membership_status: 'REMOVED', updated_by: user.id },
      `?id=eq.${memberId}&organization_id=eq.${organizationId}`,
    );
    if (!updated[0]) throw new NotFoundException('Member record not found or not accessible.');
    return updated[0];
  }

  async statusHistory(accessToken: string, organizationId: string, memberId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(memberId, 'memberId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_status_history',
      accessToken,
      `?select=id,organization_id,member_record_id,previous_status,new_status,note,changed_by,changed_at&organization_id=eq.${organizationId}&member_record_id=eq.${memberId}&order=changed_at.desc&limit=100`,
    );
  }

  private normalize(input: MemberInput, creating: boolean): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('A valid member object is required.');
    }
    const result: Record<string, unknown> = {};
    const textFields = ['first_name', 'last_name', 'member_number', 'phone', 'email', 'address', 'notes'] as const;
    const limits: Record<(typeof textFields)[number], number> = {
      first_name: 120, last_name: 160, member_number: 80, phone: 40, email: 254, address: 500, notes: 4000,
    };

    for (const field of textFields) {
      const value = input[field];
      if (value === undefined) continue;
      if (value === null && field !== 'first_name' && field !== 'last_name') {
        result[field] = null;
        continue;
      }
      if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
      const normalized = value.trim();
      if (normalized.length > limits[field] || ((field === 'first_name' || field === 'last_name') && normalized.length === 0)) {
        throw new BadRequestException(`${field} is empty or exceeds its allowed length.`);
      }
      result[field] = normalized || null;
    }

    for (const field of ['birth_date', 'baptism_date', 'joined_on'] as const) {
      const value = input[field];
      if (value === undefined) continue;
      if (value === null || value === '') {
        result[field] = null;
        continue;
      }
      if (typeof value !== 'string' || !this.isValidDate(value)) {
        throw new BadRequestException(`${field} must be a valid date in YYYY-MM-DD format.`);
      }
      result[field] = value;
    }

    if (input.gender !== undefined) {
      if (input.gender !== null && !(GENDERS as readonly string[]).includes(input.gender)) {
        throw new BadRequestException('gender is not supported.');
      }
      result.gender = input.gender;
    }
    if (input.membership_status !== undefined) {
      if (input.membership_status === 'REMOVED') {
        throw new BadRequestException('Use the member removal workflow to set REMOVED status.');
      }
      if (!(STATUSES as readonly string[]).includes(input.membership_status)) {
        throw new BadRequestException('membership_status is not supported.');
      }
      result.membership_status = input.membership_status;
    } else if (creating) {
      result.membership_status = 'ACTIVE';
    }

    if (creating) {
      for (const field of ['first_name', 'last_name'] as const) {
        if (typeof result[field] !== 'string') throw new BadRequestException(`${field} is required.`);
      }
    }
    return result;
  }

  private isValidDate(value: string): boolean {
    if (value.length !== 10 || value[4] !== '-' || value[7] !== '-') return false;
    const digits = value.slice(0, 4) + value.slice(5, 7) + value.slice(8, 10);
    if ([...digits].some((character) => character < '0' || character > '9')) return false;
    const [year, month, day] = [Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8))];
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }

  private assertUuid(value: string, field: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
  }
}
