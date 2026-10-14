"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at?: string | null;
};

type Preferences = NotificationAlertPreferences & {
  channels?: string[];
  muted_types?: string[];
};

const DEFAULT_PREFERENCES: Preferences = {
  enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  muted_types: [],
  quiet_start: null,
  quiet_end: null,
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);

  async function load() {
    try {
      const next = await resaRequest<NotificationItem[]>("/v1/notifications?limit=20");
      setItems(next);
    } catch {}
  }

  async function savePreference(patch: Partial<Preferences>) {
    if (settingsBusy) return;
    setSettingsBusy(true);
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try {
      const saved = await resaRequest<Preferences>("/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPreferences({ ...next, ...saved });
    } catch {
      setPreferences(preferences);
    } finally {
      setSettingsBusy(false);
    }
  }

  useEffect(() => {
    void load();
    void resaRequest<Preferences>("/v1/notifications/preferences")
      .then((saved) => setPreferences({ ...DEFAULT_PREFERENCES, ...saved }))
      .catch(() => undefined);

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (disposed || !data.user) return;
      channel = supabase
        .channel("resa-notifications-" + data.user.id)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + data.user.id,
        }, (payload) => {
          const next = payload.new as NotificationItem;
          setItems((current) => {
            if (current.some((item) => item.id === next.id)) return current;
            return [next, ...current].slice(0, 20);
          });
          playNotificationAlert(next.type, preferencesRef.current);
        })
        .subscribe();
    });
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  // Realtime handlers need the latest saved preferences without resubscribing.
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);

  const unread = items.filter((item) => !item.read_at).length;

  async function markAllRead() {
    if (!unread || busy) return;
    setBusy(true);
    try {
      await resaRequest("/v1/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
    } catch {} finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      await resaRequest("/v1/notifications/" + id + "/read", { method: "PATCH" });
      setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch {}
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notificações: ${unread} por ler` : "Notificações"}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--zion-border)] bg-white text-[var(--zion-muted)] shadow-[var(--zion-shadow-sm)] transition hover:border-[var(--zion-sky)] hover:bg-[var(--zion-light)] hover:text-[var(--zion-primary)]"
      >
        <span aria-hidden="true" className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--zion-border)] bg-white shadow-[var(--zion-shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--zion-border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--zion-dark)]">Notificações</p>
              <p className="text-[11px] text-[var(--zion-muted)]">{unread ? `${unread} por ler` : "Tudo em dia"}</p>
            </div>
            {unread > 0 && <button onClick={() => void markAllRead()} disabled={busy} className="text-xs font-semibold text-[var(--zion-primary)] hover:text-[var(--zion-primary-deep)]">Marcar todas como lidas</button>}
          </div>
          <div className="border-b border-[var(--zion-border)] bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Alertas neste dispositivo</p>
            <div className="flex gap-2">
              <button type="button" disabled={settingsBusy} onClick={() => void savePreference({ sound_enabled: preferences.sound_enabled === false })} aria-pressed={preferences.sound_enabled !== false} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50">
                Som: {preferences.sound_enabled === false ? "Desativado" : "Ativado"}
              </button>
              <button type="button" disabled={settingsBusy} onClick={() => void savePreference({ vibration_enabled: preferences.vibration_enabled === false })} aria-pressed={preferences.vibration_enabled !== false} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50">
                Vibração: {preferences.vibration_enabled === false ? "Desativada" : "Ativada"}
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">A reprodução depende das permissões do navegador e do suporte do dispositivo.</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!items.length && <p className="px-5 py-10 text-center text-sm text-[var(--zion-muted)]">Não há notificações.</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item.id)}
                className={`flex w-full gap-3 border-b border-[var(--zion-border)] px-4 py-3 text-left transition hover:bg-[var(--zion-light)] ${item.read_at ? "bg-white" : "bg-[var(--zion-sky)]/5"}`}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--zion-gold)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--zion-dark)]">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--zion-muted)]">{item.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
