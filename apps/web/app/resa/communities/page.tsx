"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Community = { id: string; name: string; slug: string; description?: string | null; visibility: string };

export default function CommunitiesPage() {
  const [items, setItems] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => void resaRequest<Community[]>("/v1/resa/communities").then(setItems).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar as comunidades."));
  useEffect(load, []);
  async function toggle(item: Community) {
    try {
      await resaRequest("/v1/resa/communities/" + item.id + "/join", { method: "POST" });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar na comunidade."); }
  }
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold text-[#0C1A3D]">Comunidades</h1><p className="mt-2 text-slate-500">Comunidades reais do RESA.</p>{error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{item.name}</h2><p className="mt-2 text-sm text-slate-500">{item.description || "Comunidade RESA"}</p><span className="mt-4 inline-block text-xs uppercase text-slate-400">{item.visibility}</span><button onClick={() => void toggle(item)} className="mt-5 block rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm text-white">Entrar</button></article>)}{!items.length && !error && <p className="text-slate-500">Nenhuma comunidade disponível.</p>}</div></div></main>;
}
