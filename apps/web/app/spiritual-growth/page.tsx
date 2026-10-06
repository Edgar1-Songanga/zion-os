"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";

type Event = { id: string; area: string; source: string; occurredAt: string; metadata?: Record<string, unknown> };
const labels: Record<string,string> = { bible:"Bíblia", prayer:"Oração", devotion:"Devoção", service:"Serviço", community:"Comunidade", leadership:"Liderança" };

export default function GrowthPage() {
  const supabase = createClient(); const [events, setEvents] = useState<Event[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { void (async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setError("É necessário iniciar sessão."); setLoading(false); return; }
    try { const snapshot = await resaRequest<{ events: Event[] }>("/v1/spiritual/growth?userId=" + encodeURIComponent(data.user.id) + "&period=all"); setEvents(snapshot.events ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar o crescimento espiritual."); }
    finally { setLoading(false); }
  })(); }, []);
  const counts = events.reduce<Record<string,number>>((acc, event) => { acc[event.area] = (acc[event.area] ?? 0) + 1; return acc; }, {});
  return <main className="min-h-screen bg-[#f6f8fb] px-4 py-6 sm:px-8"><div className="mx-auto max-w-6xl">
    <section className="rounded-[32px] bg-[#08152f] px-6 py-9 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">ZION OS · Spiritual Layer</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Crescimento espiritual</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Uma visão factual da sua jornada. O ZION mostra eventos reais; não inventa pontuações ou progresso.</p></section>
    {error ? <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{error}</div> : null}
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(labels).map(([key,label]) => <article key={key} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p><p className="mt-4 text-3xl font-semibold text-[#0C1A3D]">{counts[key] ?? 0}</p><p className="mt-1 text-sm text-slate-500">eventos registados</p></article>)}</section>
    <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Linha do tempo</p><h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Atividade espiritual</h2><div className="mt-6 space-y-3">{loading ? <p className="text-sm text-slate-400">A carregar…</p> : events.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500">Ainda não existem eventos de crescimento registados.</p> : events.map((event) => <div key={event.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/70 px-4 py-4"><div><p className="text-sm font-semibold text-[#0C1A3D]">{labels[event.area] ?? event.area}</p><p className="mt-1 text-xs text-slate-500">{event.source}</p></div><time className="text-xs text-slate-400">{new Date(event.occurredAt).toLocaleString("pt-PT")}</time></div>)}</div></section>
  </div></main>;
}
