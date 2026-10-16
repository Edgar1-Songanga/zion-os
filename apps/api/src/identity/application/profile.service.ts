import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type ProfilePrivacy = {
  profile_visibility: 'public' | 'community' | 'private';
  bio_visibility: 'public' | 'community' | 'private';
  country_visibility: 'public' | 'community' | 'private';
  timezone_visibility: 'public' | 'community' | 'private';
};
const DEFAULT_PRIVACY: ProfilePrivacy = { profile_visibility: 'community', bio_visibility: 'community', country_visibility: 'community', timezone_visibility: 'private' };

type Profile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  locale: string;
  timezone: string;
  privacy: ProfilePrivacy;
};

const PROFILE_FIELDS = [
  'display_name',
  'first_name',
  'last_name',
  'avatar_url',
  'bio',
  'country_code',
  'locale',
  'timezone',
  'privacy',
] as const;

@Injectable()
export class ProfileService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async getOrCreate(accessToken: string): Promise<Profile> {
    const user = await this.identity.getCurrentUser(accessToken);
    const rows = await this.db.get<Profile[]>(
      'profiles',
      accessToken,
      `?select=id,display_name,first_name,last_name,avatar_url,bio,country_code,locale,timezone,privacy&id=eq.${user.id}&limit=1`,
    );

    if (rows[0]) return rows[0];

    const created = await this.db.post<Profile[]>(
      'profiles',
      accessToken,
      { id: user.id, display_name: user.email ?? null, privacy: DEFAULT_PRIVACY },
    );

    if (!created[0]) throw new UnauthorizedException('Unable to initialize profile');
    if (created[0]) created[0].privacy = { ...DEFAULT_PRIVACY, ...(created[0].privacy ?? {}) };
    return created[0];
  }

  async getAccessContext(accessToken: string) {
    const user = await this.identity.getCurrentUser(accessToken);
    const memberships = await this.db.get<Array<{
      id: string;
      organization_id: string;
      role_id: string;
      status: string;
    }>>(
      'organization_memberships',
      accessToken,
      `?select=id,organization_id,role_id,status&user_id=eq.${user.id}&status=eq.ACTIVE&order=created_at.asc`,
    );

    if (!memberships.length) {
      return { user_id: user.id, memberships: [] };
    }

    const roleIds = [...new Set(memberships.map((item) => item.role_id))];
    const organizationIds = [...new Set(memberships.map((item) => item.organization_id))];
    const [roles, organizations, unitMemberships] = await Promise.all([
      this.db.get<Array<{ id: string; key: string; name: string }>>(
        'roles', accessToken, `?select=id,key,name&id=in.(${roleIds.join(',')})`,
      ),
      this.db.get<Array<{ id: string; name: string; organization_type: string; parent_id: string | null }>>(
        'organizations', accessToken, `?select=id,name,organization_type,parent_id&id=in.(${organizationIds.join(',')})`,
      ),
      this.db.get<Array<{ membership_id: string; unit_id: string }>>(
        'unit_memberships', accessToken, `?select=membership_id,unit_id&membership_id=in.(${memberships.map((item) => item.id).join(',')})`,
      ),
    ]);
    const unitIds = [...new Set(unitMemberships.map((item) => item.unit_id))];
    const units = unitIds.length
      ? await this.db.get<Array<{ id: string; name: string; unit_type: string; organization_id: string }>>(
        'organization_units', accessToken, `?select=id,name,unit_type,organization_id&id=in.(${unitIds.join(',')})`,
      )
      : [];
    const roleById = new Map(roles.map((item) => [item.id, item]));
    const organizationById = new Map(organizations.map((item) => [item.id, item]));
    const unitsByMembership = new Map<string, Array<{ id: string; name: string; unit_type: string }>>();
    for (const assignment of unitMemberships) {
      const unit = units.find((item) => item.id === assignment.unit_id);
      if (!unit) continue;
      const assigned = unitsByMembership.get(assignment.membership_id) ?? [];
      assigned.push({ id: unit.id, name: unit.name, unit_type: unit.unit_type });
      unitsByMembership.set(assignment.membership_id, assigned);
    }

    return {
      user_id: user.id,
      memberships: memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        role: roleById.get(membership.role_id) ?? null,
        organization: organizationById.get(membership.organization_id) ?? null,
        units: unitsByMembership.get(membership.id) ?? [],
      })),
    };
  }

  async update(accessToken: string, input: Partial<Omit<Profile, 'id'>>) {
    const user = await this.identity.getCurrentUser(accessToken);

    const updates = Object.fromEntries(
      PROFILE_FIELDS
        .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
        .map((field) => [field, input[field]]),
    ) as Partial<Omit<Profile, 'id'>>;

    if ('privacy' in updates && updates.privacy) {
      const privacy = updates.privacy as Partial<ProfilePrivacy>;
      const allowed = ['public', 'community', 'private'];
      for (const field of ['profile_visibility', 'bio_visibility', 'country_visibility', 'timezone_visibility'] as const) {
        if (privacy[field] !== undefined && !allowed.includes(privacy[field])) throw new UnauthorizedException(`Invalid privacy value for ${field}`);
      }
      updates.privacy = { ...DEFAULT_PRIVACY, ...privacy };
    }

    if ('country_code' in updates && updates.country_code) {
      updates.country_code = updates.country_code.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(updates.country_code)) {
        throw new UnauthorizedException('country_code must be a valid ISO alpha-2 code');
      }
    }

    for (const field of ['display_name', 'first_name', 'last_name', 'bio'] as const) {
      const value = updates[field];
      if (typeof value === 'string' && value.length > (field === 'bio' ? 500 : 120)) {
        throw new UnauthorizedException(`${field} exceeds the maximum allowed length`);
      }
    }

    const rows = await this.db.patch<Profile[]>(
      'profiles',
      accessToken,
      updates,
      `?id=eq.${user.id}`,
    );
    return rows[0] ?? null;
  }
}
