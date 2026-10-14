import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const RELATIONSHIPS = ['PARENT_OF', 'CHILD_OF', 'SPOUSE', 'SIBLING', 'GUARDIAN_OF', 'WARD_OF', 'OTHER'] as const;

type FamilyRelationshipInput = {
  member_record_id?: string;
  related_member_record_id?: string;
  relationship_type?: string;
  notes?: string | null;
};

@Injectable()
export class ChurchMemberFamiliesService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'church_member_family_relationships',
      accessToken,
      `?select=id,organization_id,member_record_id,related_member_record_id,relationship_type,notes,is_active,created_by,created_at,updated_at&organization_id=eq.${organizationId}&is_active=eq.true&order=created_at.desc&limit=500`,
    );
  }

  async create(accessToken: string, organizationId: string, input: FamilyRelationshipInput) {
    this.assertUuid(organizationId, 'organizationId');
    const user = await this.identity.getCurrentUser(accessToken);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('A valid family relationship object is required.');
    }
    const memberId = input.member_record_id;
    const relatedId = input.related_member_record_id;
    if (!memberId || !relatedId) {
      throw new BadRequestException('Both member_record_id and related_member_record_id are required.');
    }
    this.assertUuid(memberId, 'member_record_id');
    this.assertUuid(relatedId, 'related_member_record_id');
    if (memberId === relatedId) {
      throw new BadRequestException('A member cannot be related to themselves.');
    }
    if (!(RELATIONSHIPS as readonly string[]).includes(input.relationship_type ?? '')) {
      throw new BadRequestException('relationship_type is not supported.');
    }
    if (input.notes !== undefined && input.notes !== null && (typeof input.notes !== 'string' || input.notes.trim().length > 2000)) {
      throw new BadRequestException('notes must be text with at most 2000 characters.');
    }
    const created = await this.db.post<Array<Record<string, unknown>>>(
      'church_member_family_relationships',
      accessToken,
      {
        organization_id: organizationId,
        member_record_id: memberId,
        related_member_record_id: relatedId,
        relationship_type: input.relationship_type,
        notes: typeof input.notes === 'string' ? input.notes.trim() || null : null,
        created_by: user.id,
      },
    );
    if (!created[0]) throw new BadRequestException('The family relationship was not created.');
    return created[0];
  }

  private assertUuid(value: string, field: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID.`);
    }
  }
}
