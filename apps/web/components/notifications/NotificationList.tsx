"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import NotificationCard from "./NotificationCard";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at?: string | null;
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void resaRequest<NotificationItem[]>("/v1/notifications?limit=50")
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (disposed || !data.user) return;
      channel = supabase
        .channel("resa-notification-list-" + data.user.id)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: "user_id=eq." + data.user.id,
          },
          (payload) => {
            const next = payload.new as NotificationItem;
            setNotifications((current) => [
              next,
              ...current.filter((item) => item.id !== next.id),
            ].slice(0, 50));
          },
        )
        .subscribe();
    });

    const timer = window.setInterval(() => {
      void resaRequest<NotificationItem[]>("/v1/notifications?limit=50")
        .then(setNotifications)
        .catch(() => {});
    }, 30000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="rounded-2xl bg-white p-6 text-sm text-slate-400">A carregar notificações…</div>;

  if (!notifications.length) {
    return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400">Não há notificações neste momento.</div>;
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div key={notification.id} className={notification.read_at ? "" : "rounded-2xl ring-1 ring-blue-100"}>
          <NotificationCard
            title={notification.title}
            message={notification.body}
            type={notification.type}
          />
        </div>
      ))}
    </div>
  );
}
