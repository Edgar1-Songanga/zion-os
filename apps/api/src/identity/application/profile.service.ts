import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

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
      `?select=id,display_name,first_name,last_name,avatar_url,bio,country_code,locale,timezone&id=eq.${user.id}&limit=1`,
    );

    if (rows[0]) return rows[0];

    const created = await this.db.post<Profile[]>(
      'profiles',
      accessToken,
      { id: user.id, display_name: user.email ?? null },
    );

    if (!created[0]) throw new UnauthorizedException('Unable to initialize profile');
    return created[0];
  }

  async update(accessToken: string, input: Partial<Omit<Profile, 'id'>>) {
    const user = await this.identity.getCurrentUser(accessToken);

    const updates = Object.fromEntries(
      PROFILE_FIELDS
        .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
        .map((field) => [field, input[field]]),
    ) as Partial<Omit<Profile, 'id'>>;

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
