import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class MembershipTransferService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  async request(token: string, body: { membership_id: string; destination_organization_id: string; reason?: string }) {
    await this.identity.getCurrentUser(token);
    this.uuid(body.membership_id, 'membership_id');
    this.uuid(body.destination_organization_id, 'destination_organization_id');
    return this.db.rpc('request_membership_transfer', token, {
      p_membership_id: body.membership_id,
      p_destination_organization_id: body.destination_organization_id,
      p_reason: body.reason?.trim() || null,
    });
  }

  async decide(token: string, requestId: string, body: { decision: string; note?: string }) {
    await this.identity.getCurrentUser(token);
    this.uuid(requestId, 'transferRequestId');
    if (!['APPROVE', 'REJECT'].includes(body.decision)) {
      throw new BadRequestException('decision must be APPROVE or REJECT');
    }
    return this.db.rpc('decide_membership_transfer', token, {
      p_transfer_request_id: requestId,
      p_decision: body.decision,
      p_note: body.note?.trim() || null,
    });
  }

  async liftDiscipline(token: string, caseId: string, body: {
    vote_number: string; minutes_reference: string; decision_date: string;
    authority: string; note?: string;
  }) {
    await this.identity.getCurrentUser(token);
    this.uuid(caseId, 'caseId');
    if (!body.vote_number?.trim() || !body.minutes_reference?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.decision_date) ||
      !['CHURCH_BOARD','CHURCH_BUSINESS_MEETING','CONFERENCE_OR_MISSION','OTHER_AUTHORIZED_BODY'].includes(body.authority)) {
      throw new BadRequestException('A valid vote, minutes reference, decision date and authorized body are required');
    }
    return this.db.rpc('lift_membership_disciplinary_case', token, {
      p_case_id: caseId, p_vote_number: body.vote_number.trim(),
      p_minutes_reference: body.minutes_reference.trim(), p_decision_date: body.decision_date,
      p_authority: body.authority, p_note: body.note?.trim() || null,
    });
  }

  private uuid(value: string, field: string) {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID`);
    }
  }
}
