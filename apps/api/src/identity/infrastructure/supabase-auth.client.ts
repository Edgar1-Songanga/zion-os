import { env } from '../../config/env';

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  phone?: string;
  // Supabase Auth returns app_metadata from the server-managed user record.
  // Never read authorization decisions from user_metadata, which the user can edit.
  app_metadata?: {
    zion_global_role?: string;
    zion_verified?: boolean;
  };
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  if (!env.supabaseUrl || !env.supabasePublishableKey || !accessToken) return null;

  const response = await fetch(
    `${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`,
    {
      headers: {
        apikey: env.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) return null;
  return (await response.json()) as SupabaseAuthUser;
}
