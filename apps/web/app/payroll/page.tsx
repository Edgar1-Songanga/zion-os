"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
type Run={id:string;period_start:string;period_end:string;status:string;gross_total:number;deduction_total:number;employer_contribution_total:number;net_total:number;currency_code:string};
export default function Payroll(){
 const [runs,setRuns]=useState<Run[]>([]); const [error,setError]=useState("");
 useEffect(()=>{ void resaRequest<{id:string}[]>("/v1/organizations").then(orgs=>{const id=orgs[0]?.id;if(!id)throw new Error("Nenhuma organização administrada encontrada.");return resaRequest<Run[]>(`/v1/hr-payroll/organizations/${id}/payroll/runs`);}).then(setRuns).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
 <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">Finance • People</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Payroll</h1><p className="mt-2 text-slate-500">Processamento controlado de salários, deduções, contribuições e pagamentos.</p></header>
 {error&&<div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
 <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Processamentos</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-4">Período</th><th className="p-4">Estado</th><th className="p-4">Bruto</th><th className="p-4">Deduções</th><th className="p-4">Líquido</th></tr></thead><tbody>{runs.map(r=><tr key={r.id} className="border-b last:border-0"><td className="p-4">{r.period_start} → {r.period_end}</td><td className="p-4">{r.status}</td><td className="p-4">{Number(r.gross_total).toLocaleString()} {r.currency_code}</td><td className="p-4">{Number(r.deduction_total).toLocaleString()} {r.currency_code}</td><td className="p-4 font-semibold">{Number(r.net_total).toLocaleString()} {r.currency_code}</td></tr>)}</tbody></table></div></section>
 </div></main>;
}
