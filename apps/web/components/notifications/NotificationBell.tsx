"use client";

import { useEffect, useState } from "react";
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

  async function load() {
    try {
      const next = await resaRequest<NotificationItem[]>("/v1/notifications?limit=20");
      setItems(next);
    } catch {}
  }

  useEffect(() => {
    void load();
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = supabase
        .channel("resa-notifications-" + data.user.id)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + data.user.id,
        }, (payload) => {
          const next = payload.new as NotificationItem;
          setItems((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 20));
        })
        .subscribe();
    });
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

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
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#091735]"
      >
        <span aria-hidden="true" className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#091735]">Notificações</p>
              <p className="text-[11px] text-slate-400">{unread ? `${unread} por ler` : "Tudo em dia"}</p>
            </div>
            {unread > 0 && <button onClick={() => void markAllRead()} disabled={busy} className="text-xs font-semibold text-[#091735]">Marcar todas como lidas</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!items.length && <p className="px-5 py-10 text-center text-sm text-slate-400">Não há notificações.</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item.id)}
                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${item.read_at ? "bg-white" : "bg-blue-50/50"}`}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0C1A3D]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#091735]">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
