import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class MembershipsService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    await this.identity.getCurrentUser(accessToken);
    return this.db.get(
      'organization_memberships',
      accessToken,
      `?select=id,user_id,status,joined_at,role_id,roles(key,name)&organization_id=eq.${organizationId}&order=joined_at.asc`,
    );
  }

  async add(accessToken: string, organizationId: string, input: { user_id: string; role_id?: string; status?: string }) {
    const actor = await this.identity.getCurrentUser(accessToken);
    if (!input.user_id) throw new BadRequestException('user_id is required');

    let roleId = input.role_id;
    if (!roleId) {
      const roles = await this.db.get<{ id: string }[]>(
        'roles',
        accessToken,
        '?select=id&key=eq.member&limit=1',
      );
      roleId = roles[0]?.id;
    }
    if (!roleId) throw new BadRequestException('Default member role is not configured');

    const created = await this.db.post<Array<{ id: string; [key: string]: unknown }>>(
      'organization_memberships',
      accessToken,
      { organization_id: organizationId, user_id: input.user_id, role_id: roleId, status: input.status ?? 'ACTIVE' },
    );
    const membership = created[0];
    if (!membership) throw new BadRequestException('Membership was not created');

    await this.audit(accessToken, organizationId, actor.id, 'membership.created', 'organization_membership', membership.id, {
      user_id: input.user_id,
      role_id: roleId,
    });
    return membership;
  }

  async update(accessToken: string, organizationId: string, membershipId: string, input: { role_id?: string; status?: string }) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const patch: Record<string, unknown> = {};
    if (input.role_id !== undefined) patch.role_id = input.role_id;
    if (input.status !== undefined) patch.status = input.status;
    if (!Object.keys(patch).length) throw new BadRequestException('No changes supplied');

    const updated = await this.db.patch<Array<{ id: string; [key: string]: unknown }>>(
      'organization_memberships',
      accessToken,
      patch,
      `?id=eq.${membershipId}&organization_id=eq.${organizationId}`,
    );
    const membership = updated[0];
    if (!membership) throw new NotFoundException('Membership not found');

    await this.audit(accessToken, organizationId, actor.id, 'membership.updated', 'organization_membership', membership.id, patch);
    return membership;
  }

  async assignUnit(accessToken: string, organizationId: string, membershipId: string, unitId: string) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const units = await this.db.get<{ id: string }[]>(
      'organization_units',
      accessToken,
      `?select=id&organization_id=eq.${organizationId}&id=eq.${unitId}&limit=1`,
    );
    if (!units[0]) throw new NotFoundException('Organization unit not found');

    const rows = await this.db.post<Array<{ id: string; [key: string]: unknown }>>(
      'unit_memberships',
      accessToken,
      { unit_id: unitId, membership_id: membershipId },
    );
    const assignment = rows[0];
    if (!assignment) throw new BadRequestException('Unit assignment was not created');

    await this.audit(accessToken, organizationId, actor.id, 'membership.unit_assigned', 'unit_membership', assignment.id, {
      membership_id: membershipId,
      unit_id: unitId,
    });
    return assignment;
  }

  async removeUnit(accessToken: string, organizationId: string, membershipId: string, unitId: string) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const units = await this.db.get<{ id: string }[]>(
      'organization_units',
      accessToken,
      `?select=id&organization_id=eq.${organizationId}&id=eq.${unitId}&limit=1`,
    );
    if (!units[0]) throw new NotFoundException('Organization unit not found');

    const removed = await this.db.delete<Array<{ id: string; [key: string]: unknown }>>(
      'unit_memberships',
      accessToken,
      `?unit_id=eq.${unitId}&membership_id=eq.${membershipId}`,
    );
    if (!removed.length) throw new NotFoundException('Unit assignment not found');
    await this.audit(accessToken, organizationId, actor.id, 'membership.unit_removed', 'unit_membership', unitId, {
      membership_id: membershipId,
      unit_id: unitId,
    });
    return { success: true };
  }

  private async audit(accessToken: string, organizationId: string, actorUserId: string, action: string, resourceType: string, resourceId: string, metadata: unknown) {
    await this.db.post('audit_logs', accessToken, {
      organization_id: organizationId,
      actor_user_id: actorUserId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
    });
  }
}
