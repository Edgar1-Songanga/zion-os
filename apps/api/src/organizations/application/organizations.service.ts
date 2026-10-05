import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  parent_id: string | null;
  created_by: string;
  is_active: boolean;
};

@Injectable()
export class OrganizationsService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async listMine(accessToken: string) {
    const user = await this.identity.getCurrentUser(accessToken);
    return this.db.get<Organization[]>(
      'organizations',
      accessToken,
      `?select=id,name,slug,organization_type,parent_id,created_by,is_active&created_by=eq.${user.id}&order=created_at.desc`,
    );
  }

  async directory(accessToken: string) {
    await this.identity.getCurrentUser(accessToken);
    return this.db.get<Organization[]>(
      'organizations',
      accessToken,
      '?select=id,name,slug,organization_type,parent_id,is_active&is_active=eq.true&order=name.asc&limit=200',
    );
  }

  async create(accessToken: string, input: { name: string; slug: string; organization_type?: string }) {
    const user = await this.identity.getCurrentUser(accessToken);
    const name = input.name?.trim();
    const slug = input.slug?.trim().toLowerCase();

    if (!name || !slug) throw new BadRequestException('name and slug are required');

    const created = await this.db.post<Organization[]>(
      'organizations',
      accessToken,
      {
        name,
        slug,
        organization_type: input.organization_type ?? 'LOCAL_CHURCH',
        created_by: user.id,
      },
    );

    const organization = created[0];
    if (!organization) throw new BadRequestException('Organization was not created');

    const role = await this.db.get<{ id: string }[]>(
      'roles',
      accessToken,
      '?select=id&key=eq.organization_admin&limit=1',
    );
    if (!role[0]) throw new BadRequestException('Organization administrator role is not configured');

    await this.db.post(
      'organization_memberships',
      accessToken,
      { organization_id: organization.id, user_id: user.id, role_id: role[0].id, status: 'ACTIVE' },
    );

    await this.db.post(
      'audit_logs',
      accessToken,
      {
        organization_id: organization.id,
        actor_user_id: user.id,
        action: 'organization.created',
        resource_type: 'organization',
        resource_id: organization.id,
        metadata: { organization_type: organization.organization_type },
      },
    );

    return organization;
  }

  async memberships(accessToken: string, organizationId: string) {
    return this.db.get(
      'organization_memberships',
      accessToken,
      `?select=id,user_id,status,joined_at,role_id,roles(key,name)&organization_id=eq.${organizationId}&order=joined_at.asc`,
    );
  }
}
