import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type OrganizationMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  status: string;
};

type OrganizationUnit = {
  id: string;
  organization_id: string;
  name: string;
  unit_type: string;
  is_active: boolean;
};

type UnitAssignment = {
  id: string;
  unit_id: string;
  membership_id: string;
  created_at: string;
};

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

  async listOrganizationUnitAssignments(accessToken: string, organizationId: string) {
    await this.identity.getCurrentUser(accessToken);
    const memberships = await this.db.get<OrganizationMembership[]>(
      'organization_memberships',
      accessToken,
      `?select=id,user_id,status&organization_id=eq.${organizationId}&order=joined_at.asc`,
    );
    if (!memberships.length) return [];

    const membershipById = new Map(memberships.map((membership) => [membership.id, membership]));
    const assignments = await this.db.get<UnitAssignment[]>(
      'unit_memberships',
      accessToken,
      `?select=id,unit_id,membership_id,created_at&membership_id=in.(${memberships.map((membership) => membership.id).join(',')})&order=created_at.asc`,
    );
    if (!assignments.length) return [];

    const unitIds = [...new Set(assignments.map((assignment) => assignment.unit_id))];
    const units = await this.db.get<OrganizationUnit[]>(
      'organization_units',
      accessToken,
      `?select=id,organization_id,name,unit_type,is_active&id=in.(${unitIds.join(',')})&organization_id=eq.${organizationId}`,
    );
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    return assignments.flatMap((assignment) => {
      const unit = unitById.get(assignment.unit_id);
      const membership = membershipById.get(assignment.membership_id);
      return unit && membership ? [{ ...assignment, unit, user_id: membership.user_id, membership_status: membership.status }] : [];
    });
  }

  async listUnitAssignments(accessToken: string, organizationId: string, membershipId: string) {
    await this.identity.getCurrentUser(accessToken);
    await this.requireMembership(accessToken, organizationId, membershipId);

    const assignments = await this.db.get<UnitAssignment[]>(
      'unit_memberships',
      accessToken,
      `?select=id,unit_id,membership_id,created_at&membership_id=eq.${membershipId}&order=created_at.asc`,
    );
    if (!assignments.length) return [];

    const unitIds = [...new Set(assignments.map((assignment) => assignment.unit_id))];
    const units = await this.db.get<OrganizationUnit[]>(
      'organization_units',
      accessToken,
      `?select=id,organization_id,name,unit_type,is_active&id=in.(${unitIds.join(',')})&organization_id=eq.${organizationId}`,
    );
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    return assignments
      .filter((assignment) => unitById.has(assignment.unit_id))
      .map((assignment) => ({ ...assignment, unit: unitById.get(assignment.unit_id) }));
  }

  async assignUnit(accessToken: string, organizationId: string, membershipId: string, unitId: string) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const membership = await this.requireMembership(accessToken, organizationId, membershipId);
    if (membership.status.toUpperCase() !== 'ACTIVE') {
      throw new BadRequestException('Only active organization members can be assigned to a department');
    }
    const unit = await this.requireUnit(accessToken, organizationId, unitId);
    if (!unit.is_active) throw new BadRequestException('Inactive organization units cannot receive new assignments');

    const existing = await this.db.get<UnitAssignment[]>(
      'unit_memberships',
      accessToken,
      `?select=id,unit_id,membership_id,created_at&unit_id=eq.${unitId}&membership_id=eq.${membershipId}&limit=1`,
    );
    if (existing[0]) return existing[0];

    const rows = await this.db.upsert<UnitAssignment[]>(
      'unit_memberships',
      accessToken,
      { unit_id: unitId, membership_id: membershipId },
      '?on_conflict=unit_id,membership_id',
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
    await this.requireMembership(accessToken, organizationId, membershipId);
    await this.requireUnit(accessToken, organizationId, unitId);

    const removed = await this.db.delete<UnitAssignment[]>(
      'unit_memberships',
      accessToken,
      `?unit_id=eq.${unitId}&membership_id=eq.${membershipId}`,
    );
    if (!removed.length) throw new NotFoundException('Unit assignment not found');
    await this.audit(accessToken, organizationId, actor.id, 'membership.unit_removed', 'unit_membership', removed[0].id, {
      membership_id: membershipId,
      unit_id: unitId,
    });
    return { success: true };
  }

  private async requireMembership(accessToken: string, organizationId: string, membershipId: string) {
    const memberships = await this.db.get<OrganizationMembership[]>(
      'organization_memberships',
      accessToken,
      `?select=id,organization_id,user_id,status&id=eq.${membershipId}&organization_id=eq.${organizationId}&limit=1`,
    );
    if (!memberships[0]) throw new NotFoundException('Membership not found in this organization');
    return memberships[0];
  }

  private async requireUnit(accessToken: string, organizationId: string, unitId: string) {
    const units = await this.db.get<OrganizationUnit[]>(
      'organization_units',
      accessToken,
      `?select=id,organization_id,name,unit_type,is_active&id=eq.${unitId}&organization_id=eq.${organizationId}&limit=1`,
    );
    if (!units[0]) throw new NotFoundException('Organization unit not found');
    return units[0];
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
