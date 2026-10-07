"use client";

import { useEffect, useState } from "react";

type Employee = { id:string; employee_number:string; legal_first_name:string; legal_last_name:string; preferred_name?:string|null; employment_status:string; job_title:string; currency_code:string };
type Run = { id:string; period_start:string; period_end:string; status:string; gross_total:number; deduction_total:number; employer_contribution_total:number; net_total:number; currency_code:string };

async function request<T>(path:string, init?:RequestInit):Promise<T>{
 const res=await fetch(path,{...init,credentials:"include",headers:{"Content-Type":"application/json",...(init?.headers||{})}});
 if(!res.ok) throw new Error(await res.text());
 return res.json();
}

export default function HumanResources(){
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{ void request<Employee[]>("/api/hr/employees").then(setEmployees).catch(e=>setError(String(e))).finally(()=>setLoading(false)); },[]);
 return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10">
  <div className="mx-auto max-w-7xl">
   <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">People & Organization</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Recursos Humanos</h1><p className="mt-2 max-w-2xl text-slate-500">Cadastro institucional, vínculos, contratos, férias e ciclo de vida dos colaboradores.</p></header>
   {error&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
   <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Colaboradores</h2></div>
   {loading?<p className="p-6 text-slate-500">A carregar...</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-4">N.º</th><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Estado</th></tr></thead><tbody>{employees.map(e=><tr key={e.id} className="border-b last:border-0"><td className="p-4">{e.employee_number}</td><td className="p-4 font-medium">{e.preferred_name||e.legal_first_name+" "+e.legal_last_name}</td><td className="p-4">{e.job_title}</td><td className="p-4">{e.employment_status}</td></tr>)}</tbody></table></div>}</section>
  </div>
 </main>;
}
