import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getSupabaseUser } from '../infrastructure/supabase-auth.client';

@Injectable()
export class IdentityService {
  async getCurrentUser(accessToken: string) {
    const user = await getSupabaseUser(accessToken);
    if (!user) throw new UnauthorizedException('Invalid or expired Supabase session');
    return { id: user.id, email: user.email ?? null, phone: user.phone ?? null };
  }

  /**
   * Require a verified platform administrator for security-sensitive operations.
   * Authorization is based only on Supabase server-managed app_metadata returned
   * by Auth, never on editable user_metadata, email addresses, or request input.
   */
  async requireGlobalAdmin(accessToken: string) {
    const user = await getSupabaseUser(accessToken);
    if (!user) throw new UnauthorizedException('Invalid or expired Supabase session');

    if (
      user.app_metadata?.zion_global_role !== 'global_admin' ||
      user.app_metadata?.zion_verified !== true
    ) {
      throw new ForbiddenException('A verified ZION global administrator is required');
    }

    return { id: user.id, email: user.email ?? null };
  }
}
