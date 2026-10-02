"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Summary = { total: number; by_event: Record<string, number> };
export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void resaRequest<Summary>("/v1/platform/analytics/summary").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar analytics.")); }, []);
  return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-semibold text-[#0C1A3D]">ZION Analytics</h1>
    <p className="mt-2 text-slate-500">Eventos de produto e utilização da sua conta.</p>
    {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>}
    {data && <><div className="mt-8 rounded-3xl border bg-white p-6"><p className="text-sm text-slate-500">Eventos registados</p><p className="mt-2 text-4xl font-semibold">{data.total}</p></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{Object.entries(data.by_event).map(([name,count]) => <article key={name} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{name}</p><p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{count}</p></article>)}</div></>}
  </div></main>;
}
