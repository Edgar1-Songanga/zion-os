"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Account={id:string;code:string;name:string;account_type:string;currency_code:string;is_active:boolean};
type Entry={id:string;entry_number:number;entry_date:string;description:string;status:string};

export default function Finance() {
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [journal,setJournal]=useState<Entry[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{void resaRequest<{id:string}[]>("/v1/organizations").then(async orgs=>{
    const id=orgs[0]?.id;if(!id)throw new Error("Nenhuma organização administrada encontrada.");
    const [a,j]=await Promise.all([
      resaRequest<Account[]>(`/v1/finance/organizations/${id}/accounts`),
      resaRequest<Entry[]>(`/v1/finance/organizations/${id}/journal`)
    ]);
    setAccounts(a);setJournal(j);
  }).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);

  return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
    <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">Finance Engine</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Finanças</h1><p className="mt-2 max-w-2xl text-slate-500">Contabilidade institucional, plano de contas, livro diário e integração controlada com Payroll.</p></header>
    {error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Plano de contas</h2></div><div className="divide-y">{accounts.map(a=><div key={a.id} className="flex items-center justify-between p-4"><div><p className="font-medium">{a.code} · {a.name}</p><p className="text-xs text-slate-500">{a.account_type}</p></div><span className="text-xs">{a.currency_code}</span></div>)}{!accounts.length&&<p className="p-5 text-sm text-slate-500">Nenhuma conta configurada ainda.</p>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Livro diário</h2></div><div className="divide-y">{journal.map(e=><div key={e.id} className="p-4"><p className="font-medium">#{e.entry_number} · {e.description}</p><p className="mt-1 text-xs text-slate-500">{e.entry_date} · {e.status}</p></div>)}{!journal.length&&<p className="p-5 text-sm text-slate-500">Nenhum lançamento registado.</p>}</div></section>
    </div>
  </div></main>;
}
