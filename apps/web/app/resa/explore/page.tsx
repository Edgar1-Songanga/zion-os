"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Result = { id: string; title?: string | null; body?: string | null; entity_type?: string | null; updated_at?: string };
export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function search() {
    if (q.trim().length < 2) return;
    try { setItems(await resaRequest<Result[]>("/v1/resa/search?q=" + encodeURIComponent(q.trim()))); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível pesquisar."); }
  }
  useEffect(() => { void resaRequest<Result[]>("/v1/resa/explore").then(setItems).catch(() => {}); }, []);
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold text-[#0C1A3D]">Explorar</h1><div className="mt-6 flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void search(); }} className="flex-1 rounded-2xl border px-5 py-3" placeholder="Pesquisar no RESA..." /><button onClick={() => void search()} className="rounded-2xl bg-[#0C1A3D] px-5 py-3 text-white">Pesquisar</button></div>{error && <p role="alert" className="mt-4 text-red-600">{error}</p>}<div className="mt-8 grid gap-4 md:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-3xl border bg-white p-5"><p className="text-xs uppercase text-slate-400">{item.entity_type || "RESA"}</p><h2 className="mt-2 font-semibold">{item.title || "Resultado"}</h2><p className="mt-2 text-sm text-slate-600">{item.body || ""}</p></article>)}</div></div></main>;
}
