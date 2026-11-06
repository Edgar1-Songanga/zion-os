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
    await this.identity.getCurrentUser(accessToken);
    return this.db.get<Organization[]>(
      'organizations',
      accessToken,
      `?select=id,name,slug,organization_type,parent_id,created_by,is_active&order=created_at.desc`,
    );
  }

  async create(accessToken: string, input: { name: string; slug: string; organization_type?: string }) {
    await this.identity.getCurrentUser(accessToken);
    const name = input.name?.trim();
    const slug = input.slug?.trim().toLowerCase();

    if (!name || !slug) throw new BadRequestException('name and slug are required');
    if (input.organization_type && input.organization_type !== 'LOCAL_CHURCH') {
      throw new BadRequestException('Only local churches can be registered as organizations.');
    }

    const organization = await this.db.rpc<Organization>(
      'zion_create_local_church',
      accessToken,
      { p_name: name, p_slug: slug },
    );

    if (!organization?.id) throw new BadRequestException('Church registration did not return a valid organization');
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
