"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Result={id:string;title?:string|null;body?:string|null;entity_type?:string|null};

export default function SearchBar(){
  const [query,setQuery]=useState(""); const [results,setResults]=useState<Result[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  async function search(){const value=query.trim();if(value.length<2){setResults([]);setError("Introduza pelo menos 2 caracteres.");return;}setLoading(true);setError(null);try{setResults(await resaRequest<Result[]>(`/v1/resa/search?q=${encodeURIComponent(value)}`));}catch(e){setError(e instanceof Error?e.message:"Não foi possível pesquisar.");}finally{setLoading(false);}}
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex gap-3"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void search();}} placeholder="Pesquisar no ZION…" className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100"/><button disabled={loading} onClick={()=>void search()} className="rounded-xl bg-[#0C1A3D] px-6 py-3 text-white disabled:opacity-60">{loading?"A pesquisar…":"Pesquisar"}</button></div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{results.length>0&&<div className="mt-4 space-y-2">{results.slice(0,6).map(item=><article key={item.id} className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.entity_type||"ZION"}</p><p className="mt-1 font-semibold text-[#0C1A3D]">{item.title||"Resultado"}</p>{item.body&&<p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.body}</p>}</article>)}</div>}{!loading&&query.trim().length>=2&&results.length===0&&!error&&<p className="mt-4 text-sm text-slate-500">Nenhum resultado encontrado.</p>}</section>;
}