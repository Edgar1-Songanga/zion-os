"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Notification = { id: string; title: string; body: string; read_at?: string | null; created_at: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [message, setMessage] = useState("A carregar notificações…");

  useEffect(() => {
    resaRequest<Notification[]>("/v1/notifications?limit=50")
      .then((result) => { setItems(result); setMessage(result.length ? "" : "Nenhuma notificação encontrada."); })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as notificações."));
  }, []);

  async function markRead(id: string) {
    await resaRequest(`/v1/notifications/${id}/read`, { method: "PATCH" });
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  }

  async function markAllRead() {
    await resaRequest("/v1/notifications/read-all", { method: "POST" });
    setItems((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between rounded-3xl bg-[#0C1A3D] p-8 text-white">
          <div><p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Platform</p><h1 className="mt-2 text-4xl font-bold">Notifications</h1></div>
          <button onClick={markAllRead} className="rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/20">Marcar todas como lidas</button>
        </div>
        <div className="mt-8 space-y-4">
          {!items.length && <p className="rounded-2xl bg-white p-6 text-slate-500">{message}</p>}
          {items.map((item) => (
            <article key={item.id} className={`rounded-2xl border bg-white p-6 ${item.read_at ? "border-slate-200" : "border-[#D4AF37] shadow-sm"}`}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#0C1A3D]">{item.title}</h2><p className="mt-2 text-slate-600">{item.body}</p></div>{!item.read_at && <button onClick={() => markRead(item.id)} className="text-sm font-semibold text-[#8B6F16]">Ler</button>}</div>
              <p className="mt-4 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
