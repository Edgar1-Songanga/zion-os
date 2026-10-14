import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const STATUSES = ['ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE'] as const;
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
      `?select=id,organization_id,member_number,first_name,last_name,birth_date,gender,phone,email,address,baptism_date,membership_status,joined_on,notes,created_at,updated_at&organization_id=eq.${organizationId}&order=last_name.asc,first_name.asc&limit=100`,
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
    await this.audit(accessToken, organizationId, user.id, 'church_member.created', created[0].id, {
      member_number: created[0].member_number,
      membership_status: created[0].membership_status,
    });
    return created[0];
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
    await this.audit(accessToken, organizationId, user.id, 'church_member.updated', updated[0].id, {
      changed_fields: Object.keys(values),
    });
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
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
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
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }

  private async audit(accessToken: string, organizationId: string, actorUserId: string, action: string, resourceId: string, metadata: unknown) {
    await this.db.post('audit_logs', accessToken, {
      organization_id: organizationId,
      actor_user_id: actorUserId,
      action,
      resource_type: 'church_member_record',
      resource_id: resourceId,
      metadata,
    });
  }

  private assertUuid(value: string, field: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
  }
}
