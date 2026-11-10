"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, unlockNotificationAudio, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type CallAlertRow = { id: string; initiator_id: string; status: string; kind: "audio" | "video"; conversation_id: string };
const STOP_STATUSES = new Set(["active", "ended", "declined", "missed"]);

export default function GlobalResaCallAlerts() {
  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const supabase = createClient();
    let disposed = false;
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconcileTimer: number | null = null;
    const cleanups = new Map<string, () => void>();
    const stopTimers = new Map<string, number>();
    const pending = new Set<string>();
    const stop = (callId: string) => {
      cleanups.get(callId)?.();
      cleanups.delete(callId);
      pending.delete(callId);
      const timer = stopTimers.get(callId);
      if (timer !== undefined) window.clearTimeout(timer);
      stopTimers.delete(callId);
    };

    const ring = async (call: CallAlertRow) => {
      if (disposed || !userId || call.initiator_id === userId || call.status !== "ringing" || cleanups.has(call.id) || pending.has(call.id)) return;
      pending.add(call.id);
      try {
        let preferences: NotificationAlertPreferences = {};
        try { preferences = await resaRequest<NotificationAlertPreferences>("/v1/notifications/preferences"); } catch { /* Use safe local defaults. */ }
        if (disposed || !pending.has(call.id)) return;
        cleanups.set(call.id, playNotificationAlert(call.kind === "video" ? "resa.call.video" : "resa.call.audio", preferences, true));
        // Never leave a ringtone or vibration running indefinitely if realtime misses
        // the terminal UPDATE (for example, after a mobile network handoff).
        stopTimers.set(call.id, window.setTimeout(() => stop(call.id), 45_000));
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
      // Reconcile ringing alerts with persisted call state. Realtime is fast, but
      // mobile browsers can suspend or drop a websocket while changing screens.
      reconcileTimer = window.setInterval(async () => {
        if (disposed || cleanups.size === 0) return;
        const ids = Array.from(cleanups.keys());
        const { data } = await supabase.from("resa_calls").select("id,status").in("id", ids);
        if (disposed || !data) return;
        const stillRinging = new Set(data.filter((row) => row.status === "ringing").map((row) => row.id));
        for (const id of ids) if (!stillRinging.has(id)) stop(id);
      }, 2500);

    });

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      for (const cleanup of cleanups.values()) cleanup();
      for (const timer of stopTimers.values()) window.clearTimeout(timer);
      if (reconcileTimer !== null) window.clearInterval(reconcileTimer);
      cleanups.clear(); stopTimers.clear(); pending.clear();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
  return null;
}
