export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  iceServersJson: process.env.ZION_ICE_SERVERS_JSON ?? '',
};

export function assertSupabaseConfig(): void {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error('Supabase API configuration is missing');
  }
}

export function getIceServers(): RTCIceServer[] {
  if (!env.iceServersJson.trim()) {
    return [{ urls: ['stun:stun.l.google.com:19302'] }];
  }
  try {
    const parsed = JSON.parse(env.iceServersJson) as unknown;
    if (!Array.isArray(parsed)) throw new Error('ZION_ICE_SERVERS_JSON must be an array');
    return parsed as RTCIceServer[];
  } catch {
    throw new Error('Invalid ZION_ICE_SERVERS_JSON');
  }
}
