"use client";

import { useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, ZionOrganization } from "@/components/organization/OrganizationSelector";

type Employee = { id: string; employee_number: string; legal_first_name: string; legal_last_name: string; preferred_name?: string | null; employment_status: string; job_title: string; currency_code: string };
type Leave = { id: string; employee_id: string; leave_type: string; start_date: string; end_date: string; status: string; reason?: string | null };

export default function HumanResources() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leave, setLeave] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [workEmail, setWorkEmail] = useState("");
  const [countryCode, setCountryCode] = useState("AO");
  const [currencyCode, setCurrencyCode] = useState("AOA");
  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  async function refresh(id: string) {
    const [nextEmployees, nextLeave] = await Promise.all([
      resaRequest<Employee[]>(`/v1/hr-payroll/organizations/${id}/employees`),
      resaRequest<Leave[]>(`/v1/hr-payroll/organizations/${id}/leave`),
    ]);
    setEmployees(nextEmployees);
    setLeave(nextLeave);
    setLeaveEmployeeId((current) => nextEmployees.some((employee) => employee.id === current) ? current : (nextEmployees[0]?.id ?? ""));
  }

  const load = (id: string, org: ZionOrganization) => {
    setOrganizationId(id); setOrganization(org); setLoading(true); setError(""); setNotice("");
    void refresh(id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados de RH."))
      .finally(() => setLoading(false));
  };

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await resaRequest<Employee>(`/v1/hr-payroll/organizations/${organizationId}/employees`, {
        method: "POST",
        body: JSON.stringify({ employee_number: employeeNumber.trim(), legal_first_name: firstName.trim(), legal_last_name: lastName.trim(), hire_date: hireDate, job_title: jobTitle.trim(), work_email: workEmail.trim() || null, country_code: countryCode.trim().toUpperCase(), currency_code: currencyCode.trim().toUpperCase() }),
      });
      setEmployees((current) => [...current, created].sort((a, b) => a.legal_last_name.localeCompare(b.legal_last_name)));
      setLeaveEmployeeId(created.id);
      setEmployeeNumber(""); setFirstName(""); setLastName(""); setJobTitle(""); setWorkEmail("");
      setNotice(`Colaborador ${created.employee_number} registado.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar o colaborador.");
    } finally { setBusy(false); }
  }

  async function createLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !leaveEmployeeId || busy) return;
    if (leaveEnd < leaveStart) { setError("A data final das férias tem de ser igual ou posterior à data inicial."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await resaRequest<Leave>(`/v1/hr-payroll/organizations/${organizationId}/employees/${leaveEmployeeId}/leave`, {
        method: "POST", body: JSON.stringify({ leave_type: leaveType, start_date: leaveStart, end_date: leaveEnd }),
      });
      setLeave((current) => [created, ...current]);
      setLeaveStart(""); setLeaveEnd("");
      setNotice("Pedido de férias registado para revisão.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar o pedido de férias.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">People & Organization</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Recursos Humanos</h1><p className="mt-2 max-w-2xl text-slate-500">Colaboradores, vínculos e férias. Os registos pessoais são protegidos pelo acesso hierárquico da organização.</p></div><OrganizationSelector value={organizationId} onChange={load}/></header>
    {organization&&<div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Organização: <strong className="text-slate-900">{organization.name}</strong> · {organization.organization_type}</div>}
    {error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice&&<div aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <div className="mb-6 grid gap-5 lg:grid-cols-2">
      <form onSubmit={createEmployee} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Registar colaborador</h2>
        <p className="mt-1 text-xs text-slate-500">Não inclua identificadores nacionais ou dados bancários nesta ficha inicial. Requer permissão HR Manager.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required maxLength={40} value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} placeholder="N.º de colaborador" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required maxLength={120} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Nome legal" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required maxLength={120} value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Apelido legal" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required maxLength={160} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Cargo" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <label className="text-xs text-slate-500">Data de admissão<input required type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
          <input type="email" maxLength={254} value={workEmail} onChange={(event) => setWorkEmail(event.target.value)} placeholder="Email profissional (opcional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <label className="text-xs text-slate-500">País (ISO 3166-1 alpha-2)<input required minLength={2} maxLength={2} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase text-slate-800" /></label>
          <label className="text-xs text-slate-500">Moeda (ISO 4217)<input required minLength={3} maxLength={3} value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase text-slate-800" /></label>
        </div>
        <button disabled={!organizationId || !employeeNumber.trim() || !firstName.trim() || !lastName.trim() || !jobTitle.trim() || busy} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "A guardar…" : "Registar colaborador"}</button>
      </form>

      <form onSubmit={createLeave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Registar pedido de férias</h2>
        <p className="mt-1 text-xs text-slate-500">O pedido fica pendente; não aprova nem altera folha salarial automaticamente.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select required value={leaveEmployeeId} onChange={(event) => setLeaveEmployeeId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2"><option value="">Selecionar colaborador</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} · {employee.legal_first_name} {employee.legal_last_name}</option>)}</select>
          <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ANNUAL">Férias anuais</option><option value="SICK">Doença</option><option value="PERSONAL">Pessoal</option><option value="PARENTAL">Parental</option><option value="OTHER">Outro</option></select>
          <span />
          <label className="text-xs text-slate-500">Início<input required type="date" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
          <label className="text-xs text-slate-500">Fim<input required type="date" value={leaveEnd} onChange={(event) => setLeaveEnd(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
        </div>
        <button disabled={!organizationId || !leaveEmployeeId || !leaveStart || !leaveEnd || busy} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "A guardar…" : "Registar pedido"}</button>
      </form>
    </div>

    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Colaboradores</h2></div>
      {loading ? <p className="p-6 text-slate-500">A carregar…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-4">N.º</th><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Estado</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id} className="border-b last:border-0"><td className="p-4">{employee.employee_number}</td><td className="p-4 font-medium">{employee.preferred_name || `${employee.legal_first_name} ${employee.legal_last_name}`}</td><td className="p-4">{employee.job_title}</td><td className="p-4">{employee.employment_status}</td></tr>)}</tbody></table>{!employees.length&&!loading&&<p className="p-6 text-sm text-slate-500">Nenhum colaborador encontrado.</p>}</div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Pedidos de ausência</h2></div><div className="divide-y">{leave.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{item.leave_type}</p><p className="text-xs text-slate-500">{item.start_date} → {item.end_date}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{item.status}</span></article>)}{!leave.length&&<p className="p-5 text-sm text-slate-500">Nenhum pedido de ausência registado.</p>}</div></section>
  </div></main>;
}
