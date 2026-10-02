"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Schedule = { id: string; scheduled_for: string; status: string; content_id: string; resa_contents?: { title?: string | null } | null };
export default function CreatorStudioPage() {
  const [items, setItems] = useState<Schedule[]>([]); const [error, setError] = useState<string | null>(null);
  const load = () => { void resaRequest<Schedule[]>("/v1/resa/creator/schedules").then(setItems).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar o Creator Studio.")); };
  useEffect(load, []);
  async function cancel(id: string) { await resaRequest("/v1/resa/creator/schedules/" + id, { method: "DELETE" }); load(); }
  return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-6xl">
    <div className="rounded-3xl border bg-white p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#8B6F16]">RESA</p><h1 className="mt-2 text-3xl font-semibold text-[#0C1A3D]">Creator Studio</h1><p className="mt-2 text-slate-500">Planeie e acompanhe publicações agendadas.</p></div>
    {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>}
    <div className="mt-6 space-y-4">{items.length ? items.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#0C1A3D]">{item.resa_contents?.title || "Publicação RESA"}</h2><p className="mt-1 text-sm text-slate-500">{new Date(item.scheduled_for).toLocaleString()}</p><p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{item.status}</p></div>{item.status === "scheduled" && <button onClick={() => void cancel(item.id)} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button>}</div></article>) : <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Nenhuma publicação agendada.</div>}</div>
  </div></main>;
}
