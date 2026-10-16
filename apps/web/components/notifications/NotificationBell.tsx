"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

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
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const pushPublicKey = process.env.NEXT_PUBLIC_RESA_VAPID_PUBLIC_KEY || "BEmbs-5tKPOjip3OfVkjD4VynTnbOTxGQkXohOT_3KTCF-vCRJzbpLrJubl1y6CowFavkTDf1gSIJdXqNK2CJP8";

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void navigator.serviceWorker.getRegistration("/sw.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setPushEnabled(Boolean(subscription)))
      .catch(() => setPushEnabled(false));
  }, []);

  function decodeVapidPublicKey(value: string): Uint8Array {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }

  async function togglePush() {
    if (pushBusy) return;
    setPushBusy(true);
    setPushMessage("");
    try {
      if (!pushPublicKey) {
        setPushMessage("A configuração segura de Web Push ainda não foi concluída.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushMessage("Este navegador não suporta notificações push. Em alguns telemóveis, instale o RESA como aplicação.");
        return;
      }
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Inicie sessão para configurar as notificações.");

      const registration = await navigator.serviceWorker.register("/sw.js");
      if (pushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          const { error } = await supabase.from("resa_push_subscriptions")
            .delete().eq("user_id", authData.user.id).eq("endpoint", endpoint);
          if (error) throw error;
        }
        setPushEnabled(false);
        setPushMessage("Notificações push desativadas neste dispositivo.");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMessage("Permita notificações nas definições do navegador para continuar.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(pushPublicKey) as BufferSource,
      });
      const serialized = subscription.toJSON();
      const p256dh = serialized.keys?.p256dh;
      const auth = serialized.keys?.auth;
      if (!p256dh || !auth) {
        await subscription.unsubscribe();
        throw new Error("O navegador não devolveu as chaves necessárias para o push.");
      }
      const { error } = await supabase.from("resa_push_subscriptions").upsert({
        user_id: authData.user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth_secret: auth,
        expiration_time: subscription.expirationTime,
        user_agent: navigator.userAgent.slice(0, 500),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) {
        await subscription.unsubscribe();
        throw error;
      }
      setPushEnabled(true);
      setPushMessage("Notificações push ativadas neste dispositivo.");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "Não foi possível configurar as notificações push.");
    } finally {
      setPushBusy(false);
    }
  }

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
              {unread > 0 && <button onClick={() => void markAllRead()} disabled={busy} className="text-xs font-semibold text-[var(--zion-primary)] hover:text-[var(--zion-primary-deep)]">Marcar todas como lidas</button>}
            </div>
            <div className="mt-3 rounded-xl border border-[var(--zion-border)] bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--zion-dark)]">Notificações neste dispositivo</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--zion-muted)]">{pushEnabled ? "Ativadas neste dispositivo." : "Ativa para receber alertas mesmo quando não estás com o RESA aberto."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void togglePush()}
                  disabled={pushBusy || (!pushPublicKey && !pushEnabled)}
                  className="shrink-0 rounded-lg bg-[var(--zion-primary)] px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pushBusy ? "A configurar…" : pushEnabled ? "Desativar" : "Ativar"}
                </button>
              </div>
              {pushMessage && <p role="status" className="mt-2 text-xs leading-5 text-[var(--zion-muted)]">{pushMessage}</p>}
              {!pushPublicKey && !pushEnabled && <p className="mt-2 text-[11px] text-[var(--zion-muted)]">A configuração das chaves ainda não está concluída.</p>}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!items.length && <p className="px-5 py-10 text-center text-sm text-[var(--zion-muted)]">Não há notificações.</p>}
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
