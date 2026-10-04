"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type EventItem = { id: string; title: string; description?: string | null; starts_at: string; ends_at?: string | null; location?: string | null; meeting_url?: string | null };

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void resaRequest<EventItem[]>("/v1/resa/events").then(setItems).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar os eventos.")); }, []);
  async function respond(id: string, response: string) {
    try { await resaRequest("/v1/resa/events/" + id + "/respond", { method: "POST", body: JSON.stringify({ response }) }); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível responder ao evento."); }
  }
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold text-[#0C1A3D]">Eventos</h1><p className="mt-2 text-slate-500">Agenda operacional do RESA.</p>{error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-8 space-y-4">{items.map(item => <article key={item.id} className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-semibold">{item.title}</h2><p className="mt-2 text-slate-600">{item.description || "Evento RESA"}</p><p className="mt-3 text-sm text-slate-500">{new Date(item.starts_at).toLocaleString("pt-PT")}{item.location ? " · " + item.location : ""}</p></div><div className="flex gap-2"><button onClick={() => void respond(item.id, "interested")} className="rounded-xl border px-3 py-2 text-sm">Tenho interesse</button><button onClick={() => void respond(item.id, "going")} className="rounded-xl bg-[#0C1A3D] px-3 py-2 text-sm text-white">Vou</button></div></div>{item.meeting_url && <a className="mt-4 inline-block text-sm underline" href={item.meeting_url}>Abrir reunião</a>}</article>)}{!items.length && !error && <p className="text-slate-500">Nenhum evento disponível.</p>}</div></div></main>;
}
