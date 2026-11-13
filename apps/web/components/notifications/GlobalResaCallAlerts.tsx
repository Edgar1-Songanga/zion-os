"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, unlockNotificationAudio, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type CallAlertRow = { id: string; initiator_id: string; status: string; kind: "audio" | "video"; conversation_id: string; created_at: string };
const STOP_STATUSES = new Set(["active", "ended", "declined", "missed"]);
const CALL_RING_WINDOW_MS = 60_000;

function isFreshRingingCall(call: CallAlertRow): boolean {
  const createdAt = Date.parse(call.created_at);
  return Number.isFinite(createdAt) && createdAt <= Date.now() + 5_000 && Date.now() - createdAt <= CALL_RING_WINDOW_MS;
}

export default function GlobalResaCallAlerts() {
  const [incomingCall, setIncomingCall] = useState<CallAlertRow | null>(null);
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
      setIncomingCall((current) => current?.id === callId ? null : current);
      pending.delete(callId);
      const timer = stopTimers.get(callId);
      if (timer !== undefined) window.clearTimeout(timer);
      stopTimers.delete(callId);
    };

    const ring = async (call: CallAlertRow) => {
      if (disposed || !userId || call.initiator_id === userId || call.status !== "ringing" || !isFreshRingingCall(call) || cleanups.has(call.id) || pending.has(call.id)) return;
      pending.add(call.id);
      try {
        let preferences: NotificationAlertPreferences = {};
        try { preferences = await resaRequest<NotificationAlertPreferences>("/v1/notifications/preferences"); } catch { /* Use safe local defaults. */ }
        if (disposed || !pending.has(call.id)) return;
        setIncomingCall(call);
        cleanups.set(call.id, playNotificationAlert(call.kind === "video" ? "resa.call.video" : "resa.call.audio", preferences, true));
        // Never leave a ringtone or vibration running indefinitely if realtime misses
        // the terminal UPDATE (for example, after a mobile network handoff).
        stopTimers.set(call.id, window.setTimeout(() => stop(call.id), 45_000));
      } finally { pending.delete(call.id); }
    };

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (disposed || error || !data.user?.id) return;
      userId = data.user.id;
      const syncRingingCalls = async () => {
        const cutoff = new Date(Date.now() - CALL_RING_WINDOW_MS).toISOString();
        const { data: ringingCalls } = await supabase.from("resa_calls")
          .select("id,initiator_id,status,kind,conversation_id,created_at")
          .eq("status", "ringing")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: true });
        if (!disposed && ringingCalls) for (const call of ringingCalls as CallAlertRow[]) void ring(call);
      };
      channel = supabase.channel("zion-global-incoming-calls-" + userId)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "resa_calls" }, (payload) => { void ring(payload.new as CallAlertRow); })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resa_calls" }, (payload) => {
          const call = payload.new as CallAlertRow;
          if (STOP_STATUSES.has(call.status)) stop(call.id);
          else if (call.status === "ringing") void ring(call);
        })
        .subscribe((status) => {
          // Subscribe first, then reconcile to close the query/subscription race.
          if (status === "SUBSCRIBED") void syncRingingCalls();
        });
      // Reconcile ringing alerts with persisted call state. Realtime is fast, but
      // mobile browsers can suspend or drop a websocket while changing screens.
      reconcileTimer = window.setInterval(async () => {
        if (disposed || cleanups.size === 0) return;
        const ids = Array.from(cleanups.keys());
        const { data } = await supabase.from("resa_calls").select("id,status").in("id", ids);
        if (disposed || !data) return;
        for (const row of data) if (row.status !== "ringing") stop(row.id);
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
  return incomingCall ? (
    <div role="alertdialog" aria-live="assertive" aria-label="Chamada recebida" className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-4 text-[#0C1A3D] shadow-2xl">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Chamada recebida</p>
        <p className="mt-1 truncate text-sm font-semibold">{incomingCall.kind === "video" ? "Videochamada" : "Chamada de áudio"} no RESA</p>
        <p className="mt-0.5 text-xs text-slate-500">Abra a conversa para atender ou recusar.</p>
      </div>
      <a href={"/resa/messages?conversation=" + encodeURIComponent(incomingCall.conversation_id)} className="shrink-0 rounded-xl bg-[#0C1A3D] px-4 py-3 text-xs font-bold text-white">Abrir chamada</a>
    </div>
  ) : null;
}
