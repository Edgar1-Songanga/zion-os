"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Result={id:string;title?:string|null;body?:string|null;entity_type?:string|null};

export default function SearchBar(){
  const [query,setQuery]=useState(""); const [results,setResults]=useState<Result[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  async function search(){const value=query.trim();if(value.length<2){setResults([]);setError("Introduza pelo menos 2 caracteres.");return;}setLoading(true);setError(null);try{setResults(await resaRequest<Result[]>(`/v1/resa/search?q=${encodeURIComponent(value)}`));}catch(e){setError(e instanceof Error?e.message:"Não foi possível pesquisar.");}finally{setLoading(false);}}
  return <section className="rounded-3xl border border-[var(--zion-border)] bg-white p-4 shadow-[var(--zion-shadow-sm)]"><div className="flex gap-3"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void search();}} placeholder="Pesquisar no ZION…" className="flex-1 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] px-4 py-3 text-[var(--zion-dark)] outline-none transition focus:border-[var(--zion-sky)] focus:bg-white focus:ring-4 focus:ring-[var(--zion-sky)]/10"/><button disabled={loading} onClick={()=>void search()} className="rounded-xl bg-[var(--zion-primary)] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">{loading?"A pesquisar…":"Pesquisar"}</button></div>{error&&<p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{results.length>0&&<div className="mt-4 space-y-2">{results.slice(0,6).map(item=><article key={item.id} className="rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--zion-muted)]">{item.entity_type||"ZION"}</p><p className="mt-1 font-semibold text-[var(--zion-primary)]">{item.title||"Resultado"}</p>{item.body&&<p className="mt-1 line-clamp-2 text-sm text-[var(--zion-muted)]">{item.body}</p>}</article>)}</div>}{!loading&&query.trim().length>=2&&results.length===0&&!error&&<p className="mt-4 text-sm text-[var(--zion-muted)]">Nenhum resultado encontrado.</p>}</section>;
}
