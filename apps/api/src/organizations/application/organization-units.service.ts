import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type Unit = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  unit_type: string;
  description: string | null;
  is_active: boolean;
};

@Injectable()
export class OrganizationUnitsService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async list(accessToken: string, organizationId: string) {
    await this.identity.getCurrentUser(accessToken);
    return this.db.get<Unit[]>(
      'organization_units',
      accessToken,
      `?select=id,organization_id,parent_id,name,unit_type,description,is_active&organization_id=eq.${organizationId}&order=name.asc`,
    );
  }

  async create(accessToken: string, organizationId: string, input: { name: string; unit_type?: string; description?: string; parent_id?: string | null }) {
    const user = await this.identity.getCurrentUser(accessToken);
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    const created = await this.db.post<Unit[]>(
      'organization_units',
      accessToken,
      {
        organization_id: organizationId,
        parent_id: input.parent_id ?? null,
        name,
        unit_type: input.unit_type?.trim() || 'DEPARTMENT',
        description: input.description?.trim() || null,
      },
    );
    const unit = created[0];
    if (!unit) throw new BadRequestException('Organization unit was not created');

    await this.audit(accessToken, organizationId, user.id, 'organization_unit.created', 'organization_unit', unit.id, {
      parent_id: unit.parent_id,
      unit_type: unit.unit_type,
    });
    return unit;
  }

  async update(accessToken: string, organizationId: string, unitId: string, input: Partial<{ name: string; unit_type: string; description: string | null; parent_id: string | null; is_active: boolean }>) {
    const user = await this.identity.getCurrentUser(accessToken);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.unit_type !== undefined) patch.unit_type = input.unit_type.trim();
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.parent_id !== undefined) patch.parent_id = input.parent_id;
    if (input.is_active !== undefined) patch.is_active = input.is_active;
    if (!Object.keys(patch).length) throw new BadRequestException('No changes supplied');

    const updated = await this.db.patch<Unit[]>(
      'organization_units',
      accessToken,
      patch,
      `?id=eq.${unitId}&organization_id=eq.${organizationId}`,
    );
    const unit = updated[0];
    if (!unit) throw new NotFoundException('Organization unit not found');

    await this.audit(accessToken, organizationId, user.id, 'organization_unit.updated', 'organization_unit', unit.id, patch);
    return unit;
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
