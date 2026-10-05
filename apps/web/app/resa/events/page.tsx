"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type EventItem = {
  id: string; title: string; description?: string | null; starts_at: string; ends_at?: string | null;
  location?: string | null; meeting_url?: string | null; my_response?: "interested" | "going" | "declined" | null;
};

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setItems(await resaRequest<EventItem[]>("/v1/resa/events")); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os eventos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function respond(id: string, response: "interested" | "going" | "declined") {
    setBusyId(id); setError(null);
    try { await resaRequest(`/v1/resa/events/${id}/respond`, { method: "POST", body: JSON.stringify({ response }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar a sua participação."); }
    finally { setBusyId(null); }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-[#0C1A3D] p-7 text-white shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Eventos</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A agenda da sua comunidade.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Descubra eventos reais, confirme presença e entre diretamente em reuniões online quando disponíveis.</p>
        </header>
        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <section className="mt-8 space-y-4">
          {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-[1.75rem] border bg-white" />) :
          items.length ? items.map(item => (
            <article key={item.id} className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{new Date(item.starts_at).toLocaleDateString("pt-PT", {day:"2-digit", month:"long", year:"numeric"})}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description || "Evento da rede RESA."}</p>
                  <p className="mt-3 text-sm font-medium text-slate-500">{new Date(item.starts_at).toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"})}{item.location ? ` · ${item.location}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyId===item.id} onClick={() => void respond(item.id, "interested")} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${item.my_response==="interested" ? "border-blue-300 bg-blue-50 text-blue-800" : "bg-white text-slate-700"}`}>Interesse</button>
                  <button disabled={busyId===item.id} onClick={() => void respond(item.id, "going")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${item.my_response==="going" ? "bg-emerald-600 text-white" : "bg-[#0C1A3D] text-white"}`}>Vou</button>
                  {item.meeting_url && <a className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#0C1A3D]" href={item.meeting_url} target="_blank" rel="noreferrer">Abrir reunião</a>}
                </div>
              </div>
            </article>
          )) : <div className="rounded-[1.75rem] border border-dashed bg-white p-12 text-center text-slate-500">Não existem eventos disponíveis neste momento.</div>}
        </section>
      </div>
    </main>
  );
}