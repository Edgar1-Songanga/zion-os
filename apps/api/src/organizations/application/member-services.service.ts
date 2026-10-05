import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type ServiceType = 'MEMBERSHIP_TRANSFER' | 'RECOMMENDATION_LETTER' | 'CHILD_DEDICATION' | 'BAPTISM_REQUEST' | 'PASTORAL_VISIT' | 'GENERAL_SECRETARY_SERVICE';
type RequestStatus = 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

@Injectable()
export class MemberServicesService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  private clean(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} is required`);
    return value.trim();
  }

  private async user(token: string) { return this.identity.getCurrentUser(token); }

  async mine(token: string) {
    const actor = await this.user(token);
    return this.db.get<any[]>('member_service_requests', token, `?select=*,organization:organizations!organization_id(id,name),destination:organizations!destination_organization_id(id,name)&applicant_user_id=eq.${actor.id}&order=created_at.desc`);
  }

  async get(token: string, requestId: string) {
    const actor = await this.user(token);
    const rows = await this.db.get<any[]>('member_service_requests', token, `?select=*,organization:organizations!organization_id(id,name),destination:organizations!destination_organization_id(id,name),events:member_service_request_events(*)&id=eq.${this.clean(requestId, 'request_id')}&limit=1`);
    const request = rows[0];
    if (!request || request.applicant_user_id !== actor.id) {
      // The database RLS still enforces secretary access for authorized reviewers.
      if (!request) throw new NotFoundException('Service request not found');
    }
    return request;
  }

  async create(token: string, input: { organization_id: string; destination_organization_id?: string; service_type: ServiceType; subject: string; details?: Record<string, unknown>; applicant_notes?: string }) {
    const actor = await this.user(token);
    const organizationId = this.clean(input.organization_id, 'organization_id');
    const type = this.clean(input.service_type, 'service_type') as ServiceType;
    const allowed: ServiceType[] = ['MEMBERSHIP_TRANSFER', 'RECOMMENDATION_LETTER', 'CHILD_DEDICATION', 'BAPTISM_REQUEST', 'PASTORAL_VISIT', 'GENERAL_SECRETARY_SERVICE'];
    if (!allowed.includes(type)) throw new BadRequestException('Unsupported service_type');
    if (type === 'MEMBERSHIP_TRANSFER' && !input.destination_organization_id) throw new BadRequestException('destination_organization_id is required for a transfer');
    if (input.destination_organization_id === organizationId) throw new BadRequestException('Destination organization must be different');
    const created = await this.db.post<any[]>('member_service_requests', token, {
      applicant_user_id: actor.id,
      organization_id: organizationId,
      destination_organization_id: input.destination_organization_id ?? null,
      service_type: type,
      subject: this.clean(input.subject, 'subject'),
      details: input.details ?? {},
      applicant_notes: input.applicant_notes?.trim() || null,
    });
    const request = created[0];
    if (!request) throw new BadRequestException('Service request was not created');
    await this.db.post('member_service_request_events', token, { request_id: request.id, actor_user_id: actor.id, to_status: 'SUBMITTED', note: input.applicant_notes?.trim() || null });
    return request;
  }

  async inbox(token: string, organizationId: string) {
    this.clean(organizationId, 'organization_id');
    return this.db.get<any[]>('member_service_requests', token, `?select=*,organization:organizations!organization_id(id,name),destination:organizations!destination_organization_id(id,name)&or=(organization_id.eq.${organizationId},destination_organization_id.eq.${organizationId})&status=in.(SUBMITTED,IN_REVIEW,APPROVED)&order=created_at.asc`);
  }

  async updateStatus(token: string, requestId: string, status: RequestStatus, note?: string) {
    const actor = await this.user(token);
    const allowed: RequestStatus[] = ['IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid secretary status transition');
    const currentRows = await this.db.get<any[]>('member_service_requests', token, `?select=id,status& id=eq.${this.clean(requestId, 'request_id')}&limit=1`.replace('?select=id,status& ', '?select=id,status&'));
    const current = currentRows[0];
    if (!current) throw new NotFoundException('Service request not found');
    const allowedFrom: Record<RequestStatus, RequestStatus[]> = { IN_REVIEW: ['SUBMITTED'], APPROVED: ['IN_REVIEW'], REJECTED: ['SUBMITTED', 'IN_REVIEW'], COMPLETED: ['APPROVED'], SUBMITTED: [], CANCELLED: [] };
    if (!allowedFrom[status].includes(current.status as RequestStatus)) throw new BadRequestException(`Cannot move request from ${current.status} to ${status}`);
    const patch: Record<string, unknown> = { status, reviewer_notes: note?.trim() || null, reviewed_by: actor.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (status === 'COMPLETED') { patch.completed_by = actor.id; patch.completed_at = new Date().toISOString(); }
    const updated = await this.db.patch<any[]>('member_service_requests', token, patch, `?id=eq.${requestId}`);
    const request = updated[0];
    if (!request) throw new NotFoundException('Service request not found or not authorized');
    await this.db.post('member_service_request_events', token, { request_id: requestId, actor_user_id: actor.id, from_status: current.status, to_status: status, note: note?.trim() || null });
    return request;
  }

  async cancel(token: string, requestId: string) {
    const actor = await this.user(token);
    const updated = await this.db.patch<any[]>('member_service_requests', token, { status: 'CANCELLED', updated_at: new Date().toISOString() }, `?id=eq.${this.clean(requestId, 'request_id')}&applicant_user_id=eq.${actor.id}&status=in.(SUBMITTED,IN_REVIEW)`);
    const request = updated[0];
    if (!request) throw new UnauthorizedException('Only the applicant can cancel a pending request');
    await this.db.post('member_service_request_events', token, { request_id: requestId, actor_user_id: actor.id, from_status: 'SUBMITTED', to_status: 'CANCELLED' });
    return request;
  }
}
