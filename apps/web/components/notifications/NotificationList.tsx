"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import NotificationCard from "./NotificationCard";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
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
