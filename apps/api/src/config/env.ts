export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
};

export function assertSupabaseConfig(): void {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error('Supabase API configuration is missing');
  }
}
