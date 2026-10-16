import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

type PushEvent = {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  created_at?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function destination(event: PushEvent): string {
  const data = event.data ?? {};
  const value = (key: string) => typeof data[key] === "string" ? String(data[key]) : "";
  if (value("conversation_id")) return "/resa/messages?conversation=" + encodeURIComponent(value("conversation_id"));
  if (value("content_id")) return "/resa?post=" + encodeURIComponent(value("content_id"));
  if (value("live_id")) return "/resa/live?live=" + encodeURIComponent(value("live_id"));
  if (value("event_id")) return "/resa/events?event=" + encodeURIComponent(value("event_id"));
  if (value("prayer_id")) return "/resa/prayer?prayer=" + encodeURIComponent(value("prayer_id"));
  if (event.type.startsWith("resa.message")) return "/resa/messages";
  if (event.type.startsWith("resa.")) return "/resa";
  return "/notifications";
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "BEmbs-5tKPOjip3OfVkjD4VynTnbOTxGQkXohOT_3KTCF-vCRJzbpLrJubl1y6CowFavkTDf1gSIJdXqNK2CJP8";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@zion-os.org";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey) {
    console.error("RESA push delivery is missing required server configuration.");
    return json({ error: "Push delivery is not configured" }, 503);
  }

  let event: PushEvent;
  try {
    event = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!event?.user_id || !event?.notification_id || !event?.type) {
    return json({ error: "Invalid notification event" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: vapidPrivateKey, error: vapidError } = await admin.rpc("resa_get_vapid_private_key");
    if (vapidError || typeof vapidPrivateKey !== "string" || !vapidPrivateKey) {
      console.error("RESA VAPID private key is not available in Supabase Vault.");
      return json({ error: "Push delivery is not configured" }, 503);
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const { data: subscriptions, error } = await admin
      .from("resa_push_subscriptions")
      .select("id, endpoint, p256dh, auth_secret")
      .eq("user_id", event.user_id)
      .limit(50);
    if (error) throw error;
    if (!subscriptions?.length) return json({ delivered: 0, stale: 0 });

    const isMessage = event.type.startsWith("resa.message");
    const payload = JSON.stringify({
      title: isMessage ? "Nova mensagem no RESA" : (event.title || "Notificação RESA"),
      body: isMessage ? "Recebeste uma nova mensagem." : (event.body || "Tens uma nova notificação."),
      url: destination(event),
      notificationId: event.notification_id,
      tag: "resa-" + event.notification_id,
    });

    let delivered = 0;
    let stale = 0;
    await Promise.all(subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth_secret },
        }, payload, { TTL: 60 * 60, urgency: "high" });
        delivered += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("resa_push_subscriptions").delete().eq("id", row.id);
          stale += 1;
        } else {
          console.error("RESA push delivery failed for a subscription.", statusCode ?? "unknown");
        }
      }
    }));
    return json({ delivered, stale });
  } catch (error) {
    console.error("RESA push delivery failed.", error instanceof Error ? error.message : "unknown");
    return json({ error: "Push delivery failed" }, 500);
  }
});
