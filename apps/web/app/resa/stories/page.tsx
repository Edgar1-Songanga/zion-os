"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Story = { id: string; title?: string | null; body?: string | null; created_at: string; type: string };
export default function StoriesPage() {
  const [items, setItems] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void resaRequest<Story[]>("/v1/resa/stories").then(setItems).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar as stories.")); }, []);
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold text-[#0C1A3D]">Stories</h1><p className="mt-2 text-slate-500">Conteúdo temporário do RESA usando o modelo existente.</p>{error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-8 flex gap-4 overflow-x-auto">{items.map(item => <article key={item.id} className="min-w-[280px] rounded-3xl border bg-white p-6 shadow-sm"><span className="text-xs uppercase text-slate-400">{item.type}</span><h2 className="mt-3 text-xl font-semibold">{item.title || "Story"}</h2><p className="mt-3 text-slate-600">{item.body}</p><p className="mt-5 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("pt-PT")}</p></article>)}</div>{!items.length && !error && <p className="mt-6 text-slate-500">Nenhuma story ativa.</p>}</div></main>;
}
