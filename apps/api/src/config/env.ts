export type ZionIceServer = { urls: string | string[]; username?: string; credential?: string };

export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  paymentProvider: process.env.ZION_PAYMENT_PROVIDER ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  paymentSuccessUrl: process.env.ZION_PAYMENT_SUCCESS_URL ?? '',
  paymentCancelUrl: process.env.ZION_PAYMENT_CANCEL_URL ?? '',
  receiptSigningSecret: process.env.ZION_RECEIPT_SIGNING_SECRET ?? '',
  iceServersJson: process.env.ZION_ICE_SERVERS_JSON ?? '',
  sfuUrl: process.env.ZION_SFU_URL ?? '',
  sfuControlSecret: process.env.ZION_SFU_CONTROL_SECRET ?? '',
  livekitUrl: process.env.ZION_LIVEKIT_URL ?? '',
  livekitApiKey: process.env.ZION_LIVEKIT_API_KEY ?? '',
  livekitApiSecret: process.env.ZION_LIVEKIT_API_SECRET ?? '',
};

export function assertSupabaseConfig(): void {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error('Supabase API configuration is missing');
  }
}

export function getIceServers(): ZionIceServer[] {
  if (!env.iceServersJson.trim()) {
    return [{ urls: ['stun:stun.l.google.com:19302'] }];
  }
  try {
    const parsed = JSON.parse(env.iceServersJson) as unknown;
    if (!Array.isArray(parsed)) throw new Error('ZION_ICE_SERVERS_JSON must be an array');
    return parsed as ZionIceServer[];
  } catch {
    throw new Error('Invalid ZION_ICE_SERVERS_JSON');
  }
}
