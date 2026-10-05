"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Story = { id: string; title?: string | null; body?: string | null; created_at: string; type: string };

export default function StoriesPage() {
  const [items, setItems] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError(null);
    try { setItems(await resaRequest<Story[]>("/v1/resa/stories")); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar as stories."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return (
    <main className="min-h-screen bg-[#07142f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Stories</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Momentos que expiram. Memórias que permanecem.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Stories públicas ativas na rede RESA. O conteúdo apresentado aqui é proveniente diretamente do serviço social.</p>
        </header>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <section className="mt-8 flex gap-5 overflow-x-auto pb-4">
          {loading ? Array.from({length: 5}).map((_, i) => <div key={i} className="h-[360px] min-w-[260px] animate-pulse rounded-[2rem] bg-white/10" />) :
          items.length ? items.map(item => (
            <article key={item.id} className="group relative flex min-h-[360px] min-w-[260px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-6 shadow-2xl">
              <span className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">{item.type}</span>
              <div>
                <h2 className="text-xl font-semibold">{item.title || "Story RESA"}</h2>
                <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-300">{item.body || "Conteúdo visual ou textual partilhado pela comunidade."}</p>
                <p className="mt-5 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("pt-PT")}</p>
              </div>
            </article>
          )) : <div className="w-full rounded-[2rem] border border-dashed border-white/15 p-12 text-center text-slate-300">Não existem stories ativas neste momento.</div>}
        </section>
      </div>
    </main>
  );
}