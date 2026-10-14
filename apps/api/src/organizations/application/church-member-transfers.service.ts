import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const TRANSFER_STATUSES = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as const;

type TransferInput = {
  member_record_id?: string;
  destination_organization_id?: string;
  request_date?: string;
  reason?: string | null;
  document_reference?: string | null;
};

@Injectable()
export class ChurchMemberTransfersService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_transfers',
      accessToken,
      `?select=id,member_record_id,origin_organization_id,destination_organization_id,status,request_date,reason,document_reference,requested_by,submitted_at,decided_by,decided_at,decision_note,created_at,updated_at&or=(origin_organization_id.eq.${organizationId},destination_organization_id.eq.${organizationId})&order=created_at.desc&limit=200`,
    );
  }

  async create(accessToken: string, originOrganizationId: string, input: TransferInput) {
    this.assertUuid(originOrganizationId, 'originOrganizationId');
    const user = await this.identity.getCurrentUser(accessToken);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('A valid transfer object is required.');
    }
    if (!input.member_record_id || !input.destination_organization_id) {
      throw new BadRequestException('member_record_id and destination_organization_id are required.');
    }
    this.assertUuid(input.member_record_id, 'member_record_id');
    this.assertUuid(input.destination_organization_id, 'destination_organization_id');
    if (input.destination_organization_id === originOrganizationId) {
      throw new BadRequestException('The destination must be a different organization.');
    }
    if (input.request_date !== undefined && !this.isValidDate(input.request_date)) {
      throw new BadRequestException('request_date must be a valid date in YYYY-MM-DD format.');
    }
    const reason = input.reason ?? null;
    const documentReference = input.document_reference ?? null;
    if (reason !== null && (typeof reason !== 'string' || reason.trim().length > 2000)) {
      throw new BadRequestException('reason must be text with at most 2000 characters.');
    }
    if (documentReference !== null && (typeof documentReference !== 'string' || documentReference.trim().length > 500)) {
      throw new BadRequestException('document_reference must be text with at most 500 characters.');
    }
    const created = await this.db.post<Array<Record<string, unknown>>>(
      'church_member_transfers',
      accessToken,
      {
        member_record_id: input.member_record_id,
        origin_organization_id: originOrganizationId,
        destination_organization_id: input.destination_organization_id,
        request_date: input.request_date ?? new Date().toISOString().slice(0, 10),
        reason: typeof reason === 'string' ? reason.trim() || null : null,
        document_reference: typeof documentReference === 'string' ? documentReference.trim() || null : null,
        requested_by: user.id,
        status: 'DRAFT',
      },
    );
    if (!created[0]) throw new BadRequestException('The transfer request was not created.');
    return created[0];
  }

  async changeStatus(accessToken: string, organizationId: string, transferId: string, input: { status?: string; decision_note?: string | null }) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(transferId, 'transferId');
    await this.identity.getCurrentUser(accessToken);
    if (!input || !(TRANSFER_STATUSES as readonly string[]).includes(input.status ?? '')) {
      throw new BadRequestException('A supported transfer status is required.');
    }
    const note = input.decision_note ?? null;
    if (note !== null && (typeof note !== 'string' || note.trim().length > 2000)) {
      throw new BadRequestException('decision_note must be text with at most 2000 characters.');
    }
    const updated = await this.db.patch<Array<Record<string, unknown>>>(
      'church_member_transfers',
      accessToken,
      {
        status: input.status,
        ...(input.status === 'ACCEPTED' || input.status === 'REJECTED' ? { decision_note: typeof note === 'string' ? note.trim() || null : null } : {}),
      },
      `?id=eq.${transferId}&or=(origin_organization_id.eq.${organizationId},destination_organization_id.eq.${organizationId})`,
    );
    if (!updated[0]) throw new BadRequestException('Transfer not found, not accessible, or transition rejected by policy.');
    return updated[0];
  }

  async history(accessToken: string, organizationId: string, transferId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(transferId, 'transferId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_transfer_history',
      accessToken,
      `?select=id,transfer_id,previous_status,new_status,actor_user_id,note,changed_at&transfer_id=eq.${transferId}&order=changed_at.desc&limit=100`,
    );
  }

  private isValidDate(value: string) {
    if (typeof value !== 'string' || value.length !== 10 || value[4] !== '-' || value[7] !== '-') return false;
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
