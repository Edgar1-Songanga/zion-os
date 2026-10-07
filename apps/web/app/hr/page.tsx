"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, ZionOrganization } from "@/components/organization/OrganizationSelector";

type Employee = { id:string; employee_number:string; legal_first_name:string; legal_last_name:string; preferred_name?:string|null; employment_status:string; job_title:string; currency_code:string };

export default function HumanResources(){
 const [organizationId,setOrganizationId]=useState("");
 const [organization,setOrganization]=useState<ZionOrganization|null>(null);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const load=(id:string,org:ZionOrganization)=>{setOrganizationId(id);setOrganization(org);setLoading(true);setError("");void resaRequest<Employee[]>(`/v1/hr-payroll/organizations/${id}/employees`).then(setEmployees).catch(e=>setError(e instanceof Error?e.message:String(e))).finally(()=>setLoading(false));};
 return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
  <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">People & Organization</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Recursos Humanos</h1><p className="mt-2 max-w-2xl text-slate-500">Gestão de colaboradores, vínculos, contratos e férias. O acesso respeita a hierarquia institucional.</p></div><OrganizationSelector value={organizationId} onChange={load}/></header>
  {organization&&<div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Organização: <strong className="text-slate-900">{organization.name}</strong> · {organization.organization_type}</div>}
  {error&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Colaboradores</h2></div>
  {loading?<p className="p-6 text-slate-500">A carregar...</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-4">N.º</th><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Estado</th></tr></thead><tbody>{employees.map(e=><tr key={e.id} className="border-b last:border-0"><td className="p-4">{e.employee_number}</td><td className="p-4 font-medium">{e.preferred_name||e.legal_first_name+" "+e.legal_last_name}</td><td className="p-4">{e.job_title}</td><td className="p-4">{e.employment_status}</td></tr>)}</tbody></table>{!employees.length&&!loading&&<p className="p-6 text-sm text-slate-500">Nenhum colaborador encontrado.</p>}</div>}</section>
 </div></main>;
}