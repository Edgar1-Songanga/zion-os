"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type CallAlertRow = { id: string; initiator_id: string; status: string; kind: "audio" | "video"; conversation_id: string };
const STOP_STATUSES = new Set(["active", "ended", "declined", "missed"]);

export default function GlobalResaCallAlerts() {
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const cleanups = new Map<string, () => void>();
    const pending = new Set<string>();
    const stop = (callId: string) => { cleanups.get(callId)?.(); cleanups.delete(callId); pending.delete(callId); };

    const ring = async (call: CallAlertRow) => {
      if (disposed || !userId || call.initiator_id === userId || call.status !== "ringing" || cleanups.has(call.id) || pending.has(call.id)) return;
      pending.add(call.id);
      try {
        let preferences: NotificationAlertPreferences = {};
        try { preferences = await resaRequest<NotificationAlertPreferences>("/v1/notifications/preferences"); } catch { /* Use safe local defaults. */ }
        if (disposed || !pending.has(call.id)) return;
        cleanups.set(call.id, playNotificationAlert("resa.call.incoming", preferences, true));
      } finally { pending.delete(call.id); }
    };

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (disposed || error || !data.user?.id) return;
      userId = data.user.id;
      channel = supabase.channel("zion-global-incoming-calls-" + userId)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "resa_calls" }, (payload) => { void ring(payload.new as CallAlertRow); })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resa_calls" }, (payload) => {
          const call = payload.new as CallAlertRow;
          if (STOP_STATUSES.has(call.status)) stop(call.id);
          else if (call.status === "ringing") void ring(call);
        })
        .subscribe();
      const { data: ringingCalls } = await supabase.from("resa_calls").select("id,initiator_id,status,kind,conversation_id").eq("status", "ringing");
      if (!disposed && ringingCalls) for (const call of ringingCalls as CallAlertRow[]) void ring(call);
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear(); pending.clear();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
  return null;
}
