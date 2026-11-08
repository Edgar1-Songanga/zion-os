"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type Appeal = {
  id: string; action_id: string; appellant_id: string; reason: string;
  details?: string | null; status: "open"|"reviewing"|"upheld"|"overturned";
  decision_note?: string | null; created_at: string;
};
const states = [{value:"open",label:"Novos"},{value:"reviewing",label:"Em análise"},{value:"upheld",label:"Sanção mantida"},{value:"overturned",label:"Sanção anulada"}];

export default function ContentAppealsPage() {
  const [rows,setRows] = useState<Appeal[]>([]);
  const [status,setStatus] = useState("open");
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const load = useCallback(async()=>{setError("");try{setRows(await resaRequest<Appeal[]>(`/v1/resa/moderation/content-appeals?status=${status}&limit=100`));}catch(e){setError(e instanceof Error?e.message:"Sem acesso à fila de recursos.");}},[status]);
  useEffect(()=>{void load();},[load]);
  async function decide(id:string,next:"reviewing"|"upheld"|"overturned"){
    const note=(notes[id]??"").trim();if(next!=="reviewing"&&!note){setError("A decisão final exige fundamentação.");return;}
    setBusy(id);setError("");setNotice("");
    try{await resaRequest(`/v1/resa/moderation/content-appeals/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status:next,decision_note:note})});setNotice("Recurso atualizado. Se a remoção foi anulada, a publicação foi restaurada.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível decidir o recurso.");}finally{setBusy(null);}
  }
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-3xl bg-[#0C1A3D] p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · SEGUNDA INSTÂNCIA</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Recursos contra medidas de moderação</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">A decisão é independente: o moderador que aplicou a medida não pode decidir o recurso. Anular uma remoção restaura a publicação.</p></header>
    <div className="flex flex-wrap items-center gap-2"><Link href="/admin/moderation" className="mr-auto text-sm font-semibold text-slate-600">← Moderação</Link>{states.map(s=><button key={s.value} type="button" onClick={()=>setStatus(s.value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status===s.value?"bg-[#0C1A3D] text-white":"border border-slate-200 bg-white text-slate-600"}`}>{s.label}</button>)}<button type="button" onClick={()=>void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Atualizar</button></div>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    <section className="space-y-4">{rows.map(row=><article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold uppercase text-slate-400">Recurso {row.id.slice(0,8)} · sanção {row.action_id.slice(0,8)}</p><span className="text-xs font-semibold text-slate-600">{row.status}</span></div><p className="mt-3 text-sm leading-6 text-slate-800">{row.reason}</p>{row.details&&<p className="mt-2 text-sm text-slate-600">{row.details}</p>}<p className="mt-2 text-xs text-slate-400">Apresentado em {new Date(row.created_at).toLocaleString("pt-PT")}</p>{row.status==="open"||row.status==="reviewing"?<div className="mt-4 space-y-3"><label htmlFor={`note-${row.id}`} className="block text-xs font-semibold text-slate-600">Fundamentação da revisão independente</label><textarea id={`note-${row.id}`} rows={3} maxLength={2000} value={notes[row.id]??""} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} className="w-full rounded-xl border border-slate-200 p-3 text-sm"/><div className="flex flex-wrap gap-2"><button type="button" disabled={busy!==null} onClick={()=>void decide(row.id,"reviewing")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Manter em análise</button><button type="button" disabled={busy!==null||!(notes[row.id]??"").trim()} onClick={()=>void decide(row.id,"upheld")} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Manter sanção</button><button type="button" disabled={busy!==null||!(notes[row.id]??"").trim()} onClick={()=>void decide(row.id,"overturned")} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40">Anular e restaurar</button></div></div>:row.decision_note&&<div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Decisão</p><p className="mt-2 text-sm text-slate-700">{row.decision_note}</p></div>}</article>)}{!rows.length&&!error&&<div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Não existem recursos neste estado.</div>}</section>
  </div></main>;
}
