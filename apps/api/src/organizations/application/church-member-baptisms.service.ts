import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const BAPTISM_STATUSES = ['PENDING', 'VALIDATED', 'REJECTED'] as const;

type BaptismInput = {
  member_record_id?: string;
  baptism_date?: string;
  location?: string;
  congregation_name?: string;
  minister_name?: string;
  document_reference?: string | null;
  notes?: string | null;
};
type BaptismDecision = { status?: string; validation_note?: string | null };

@Injectable()
export class ChurchMemberBaptismsService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_baptism_records',
      accessToken,
      `?select=id,organization_id,member_record_id,baptism_date,location,congregation_name,minister_name,document_reference,notes,status,created_by,validated_by,validated_at,validation_note,created_at,updated_at&organization_id=eq.${organizationId}&order=baptism_date.desc,created_at.desc&limit=200`,
    );
  }

  async create(accessToken: string, organizationId: string, input: BaptismInput) {
    this.assertUuid(organizationId, 'organizationId');
    const user = await this.identity.getCurrentUser(accessToken);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('A valid baptism record is required.');
    }
    if (!input.member_record_id) throw new BadRequestException('member_record_id is required.');
    this.assertUuid(input.member_record_id, 'member_record_id');
    const baptismDate = input.baptism_date;
    if (!baptismDate || !this.isValidDate(baptismDate)) {
      throw new BadRequestException('baptism_date must be a valid date in YYYY-MM-DD format.');
    }
    const location = this.requiredText(input.location, 'location', 250);
    const congregationName = this.requiredText(input.congregation_name, 'congregation_name', 250);
    const ministerName = this.requiredText(input.minister_name, 'minister_name', 200);
    const documentReference = this.optionalText(input.document_reference, 'document_reference', 500);
    const notes = this.optionalText(input.notes, 'notes', 4000);
    const created = await this.db.post<Array<Record<string, unknown>>>(
      'church_member_baptism_records',
      accessToken,
      {
        organization_id: organizationId,
        member_record_id: input.member_record_id,
        baptism_date: baptismDate,
        location,
        congregation_name: congregationName,
        minister_name: ministerName,
        document_reference: documentReference,
        notes,
        status: 'PENDING',
        created_by: user.id,
      },
    );
    if (!created[0]) throw new BadRequestException('The baptism record was not created.');
    return created[0];
  }

  async update(accessToken: string, organizationId: string, baptismId: string, input: BaptismInput) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(baptismId, 'baptismId');
    await this.identity.getCurrentUser(accessToken);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('A valid baptism record is required.');
    }
    const values: Record<string, unknown> = {};
    if (input.baptism_date !== undefined) {
      if (!this.isValidDate(input.baptism_date)) throw new BadRequestException('baptism_date must be a valid date in YYYY-MM-DD format.');
      values.baptism_date = input.baptism_date;
    }
    if (input.location !== undefined) values.location = this.requiredText(input.location, 'location', 250);
    if (input.congregation_name !== undefined) values.congregation_name = this.requiredText(input.congregation_name, 'congregation_name', 250);
    if (input.minister_name !== undefined) values.minister_name = this.requiredText(input.minister_name, 'minister_name', 200);
    if (input.document_reference !== undefined) values.document_reference = this.optionalText(input.document_reference, 'document_reference', 500);
    if (input.notes !== undefined) values.notes = this.optionalText(input.notes, 'notes', 4000);
    if (Object.keys(values).length === 0) throw new BadRequestException('Provide at least one supported field to update.');
    const updated = await this.db.patch<Array<Record<string, unknown>>>(
      'church_member_baptism_records',
      accessToken,
      values,
      `?id=eq.${baptismId}&organization_id=eq.${organizationId}`,
    );
    if (!updated[0]) throw new NotFoundException('Baptism record not found or not accessible.');
    return updated[0];
  }

  async decide(accessToken: string, organizationId: string, baptismId: string, input: BaptismDecision) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(baptismId, 'baptismId');
    await this.identity.getCurrentUser(accessToken);
    if (!input || !(BAPTISM_STATUSES as readonly string[]).includes(input.status ?? '') || input.status === 'PENDING') {
      throw new BadRequestException('Decision status must be VALIDATED or REJECTED.');
    }
    const validationNote = this.optionalText(input.validation_note, 'validation_note', 2000);
    const updated = await this.db.patch<Array<Record<string, unknown>>>(
      'church_member_baptism_records',
      accessToken,
      { status: input.status, validation_note: validationNote },
      `?id=eq.${baptismId}&organization_id=eq.${organizationId}&status=eq.PENDING`,
    );
    if (!updated[0]) throw new NotFoundException('Pending baptism record not found, already decided, or not accessible.');
    return updated[0];
  }

  async history(accessToken: string, organizationId: string, baptismId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(baptismId, 'baptismId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_baptism_history',
      accessToken,
      `?select=id,baptism_record_id,organization_id,previous_status,new_status,actor_user_id,note,changed_at&organization_id=eq.${organizationId}&baptism_record_id=eq.${baptismId}&order=changed_at.desc&limit=100`,
    );
  }

  private requiredText(value: unknown, field: string, maxLength: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw new BadRequestException(`${field} is required and must not exceed ${maxLength} characters.`);
    }
    return value.trim();
  }

  private optionalText(value: unknown, field: string, maxLength: number): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      throw new BadRequestException(`${field} must be text with at most ${maxLength} characters.`);
    }
    return value.trim() || null;
  }

  private isValidDate(value: unknown) {
    if (typeof value !== 'string' || value.length !== 10 || value[4] !== '-' || value[7] !== '-') return false;
    const digits = value.slice(0, 4) + value.slice(5, 7) + value.slice(8, 10);
    if ([...digits].some((character) => character < '0' || character > '9')) return false;
    const [year, month, day] = [Number(digits.slice(0, 4)), Number(digits.slice(5, 7)), Number(digits.slice(8, 10))];
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }

  private assertUuid(value: string, field: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
  }
}
