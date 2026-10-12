"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at?: string | null;
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

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

    void supabase.auth.getUser().then(({ data }) => {
      if (disposed || !data.user) return;
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

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notificações: ${unread} por ler` : "Notificações"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--zion-border)] bg-white text-[var(--zion-muted)] shadow-[var(--zion-shadow-sm)] transition hover:border-[var(--zion-sky)] hover:bg-[var(--zion-light)] hover:text-[var(--zion-primary)]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
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
            {unread > 0 && <button onClick={() => void markAllRead()} disabled={busy} className="text-xs font-semibold text-[var(--zion-primary)] hover:text-[var(--zion-primary-deep)] disabled:opacity-50">{busy ? "A atualizar…" : "Marcar todas como lidas"}</button>}
          </div>
          {loadError && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">A ligação às notificações está instável. O sistema tentará atualizar novamente.</div>}
          <div className="max-h-80 overflow-y-auto">
            {!items.length && <p className="px-5 py-10 text-center text-sm text-[var(--zion-muted)]">{loadError ? "Não foi possível atualizar as notificações." : "Não há notificações."}</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item.id)}
                className={`flex w-full gap-3 border-b border-[var(--zion-border)] px-4 py-3 text-left transition hover:bg-[var(--zion-light)] ${item.read_at ? "bg-white" : "bg-[var(--zion-sky)]/5"}`}
              >
                <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-[var(--zion-gold)]"}`} />
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
