import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getSupabaseUser } from '../infrastructure/supabase-auth.client';

@Injectable()
export class IdentityService {
  async getCurrentUser(accessToken: string) {
    const user = await getSupabaseUser(accessToken);
    if (!user) throw new UnauthorizedException('Invalid or expired Supabase session');
    return { id: user.id, email: user.email ?? null, phone: user.phone ?? null };
  }
}
