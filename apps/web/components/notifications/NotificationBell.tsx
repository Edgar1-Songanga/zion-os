"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, unlockNotificationAudio, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at?: string | null;
  data?: Record<string, unknown> | null;
};

export default function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<NotificationAlertPreferences>({ enabled: true, sound_enabled: true, vibration_enabled: true });
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const updatePreferences = (event: Event) => {
      const detail = (event as CustomEvent<NotificationAlertPreferences>).detail;
      if (detail) preferencesRef.current = { ...preferencesRef.current, ...detail };
    };
    window.addEventListener("zion:notification-preferences-updated", updatePreferences);
    const unlockAudio = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    void resaRequest<NotificationAlertPreferences>("/v1/notifications/preferences")
      .then((preferences) => { preferencesRef.current = { enabled: true, sound_enabled: true, vibration_enabled: true, ...preferences }; })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("zion:notification-preferences-updated", updatePreferences);
    };
  }, []);

  const load = useCallback(async () => {
    if (loadingRef.current || document.visibilityState === "hidden") return;
    loadingRef.current = true;
    try {
      const next = await resaRequest<NotificationItem[]>("/v1/notifications?limit=20");
      if (mountedRef.current) {
        setItems(Array.isArray(next) ? next : []);
        setLoadError(false);
      }
    } catch {
      if (mountedRef.current) setLoadError(true);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (disposed) return;
      if (error || !data.user) {
        if (error) setLoadError(true);
        return;
      }
      channel = supabase
        .channel("zion-notifications-" + data.user.id)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + data.user.id,
        }, (payload) => {
          if (payload.eventType === "INSERT") {
            const next = payload.new as NotificationItem;
            setItems((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 20));
            playNotificationAlert("notification.incoming", preferencesRef.current);
          } else {
            void load();
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void load();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (mountedRef.current) setLoadError(true);
          }
        });
    }).catch(() => {
      if (mountedRef.current) setLoadError(true);
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      mountedRef.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  const unread = items.filter((item) => !item.read_at).length;

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function markAllRead() {
    if (!unread || busy) return;
    setBusy(true);
    try {
      await resaRequest("/v1/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      await resaRequest("/v1/notifications/" + encodeURIComponent(id) + "/read", { method: "PATCH" });
      setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  function notificationDestination(item: NotificationItem) {
    const data = item.data ?? {};
    const value = (key: string) => typeof data[key] === "string" ? String(data[key]) : "";
    const conversationId = value("conversation_id");
    const contentId = value("content_id");
    if (conversationId) return "/resa/messages?conversation=" + encodeURIComponent(conversationId);
    if (contentId) return "/resa?post=" + encodeURIComponent(contentId);
    if (value("live_id")) return "/resa/live?live=" + encodeURIComponent(value("live_id"));
    if (value("event_id")) return "/resa/events?event=" + encodeURIComponent(value("event_id"));
    if (value("prayer_id")) return "/resa/prayer?prayer=" + encodeURIComponent(value("prayer_id"));
    if (item.type === "resa.follow" && value("actor_id")) return "/profile?user=" + encodeURIComponent(value("actor_id"));
    if (item.type.startsWith("resa.message")) return "/resa/messages";
    if (item.type.startsWith("resa.")) return "/resa";
    return "/notifications";
  }

  function openNotification(item: NotificationItem) {
    setOpen(false);
    void markRead(item.id);
    router.push(notificationDestination(item));
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
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
          <div className="border-b border-[var(--zion-border)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--zion-dark)]">Notificações</p>
                <p className="text-[11px] text-[var(--zion-muted)]">{unread ? `${unread} por ler` : "Tudo em dia"}</p>
              </div>
              <div className="flex items-center gap-3">{unread > 0 && <button onClick={() => void markAllRead()} disabled={busy} className="text-xs font-semibold text-[var(--zion-primary)] hover:text-[var(--zion-primary-deep)]">Marcar todas como lidas</button>}<Link href="/settings/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-[var(--zion-primary)] hover:text-[var(--zion-primary-deep)]">Definições</Link></div>
            </div>
            <div className="mt-3 rounded-xl border border-[var(--zion-border)] bg-slate-50 px-3 py-3"><p className="text-xs leading-5 text-[var(--zion-muted)]">Personaliza o som, a vibração e os alertas em segundo plano nas definições.</p></div>
          </div>
          {loadError && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">A ligação às notificações está instável. O sistema tentará atualizar novamente.</div>}
          <div className="max-h-80 overflow-y-auto">
            {!items.length && <p className="px-5 py-10 text-center text-sm text-[var(--zion-muted)]">{loadError ? "Não foi possível atualizar as notificações." : "Não há notificações."}</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openNotification(item)}
                className={`flex w-full gap-3 border-b border-[var(--zion-border)] px-4 py-3 text-left transition hover:bg-[var(--zion-light)] ${item.read_at ? "bg-white" : "bg-[var(--zion-sky)]/5"}`}
              >
                <span className={"mt-1 h-2 w-2 shrink-0 rounded-full " + (item.read_at ? "bg-slate-200" : "bg-[var(--zion-gold)]")} />
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
