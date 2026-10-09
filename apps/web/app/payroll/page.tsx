"use client";

import { useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, ZionOrganization } from "@/components/organization/OrganizationSelector";

type Run = { id: string; period_start: string; period_end: string; status: string; gross_total: number; deduction_total: number; employer_contribution_total: number; net_total: number; currency_code: string };

export default function Payroll() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");

  const load = (id: string, org: ZionOrganization) => {
    setOrganizationId(id); setOrganization(org); setError(""); setNotice("");
    void resaRequest<Run[]>(`/v1/hr-payroll/organizations/${id}/payroll/runs`)
      .then(setRuns).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os processamentos."));
  };

  async function createRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || busy) return;
    if (periodEnd < periodStart) { setError("O fim do período tem de ser igual ou posterior ao início."); return; }
    setBusy("create"); setError(""); setNotice("");
    try {
      const created = await resaRequest<Run>(`/v1/hr-payroll/organizations/${organizationId}/payroll/runs`, {
        method: "POST", body: JSON.stringify({ period_start: periodStart, period_end: periodEnd, pay_date: payDate || undefined }),
      });
      setRuns((current) => [created, ...current]);
      setNotice("Período de Payroll criado em rascunho; reveja os componentes antes do cálculo.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar o período."); }
    finally { setBusy(""); }
  }

  async function calculate(id: string) {
    setBusy(id); setError(""); setNotice("");
    try {
      const updated = await resaRequest<Run>(`/v1/hr-payroll/organizations/${organizationId}/payroll/runs/${id}/calculate`, { method: "POST" });
      setRuns((current) => current.map((run) => run.id === id ? updated : run));
      setNotice("Cálculo concluído. O processamento aguarda aprovação autorizada.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível calcular o Payroll."); }
    finally { setBusy(""); }
  }

  async function approve(id: string) {
    setBusy(id); setError(""); setNotice("");
    try {
      await resaRequest(`/v1/hr-payroll/organizations/${organizationId}/payroll/runs/${id}/approve`, { method: "POST" });
      setRuns((current) => current.map((run) => run.id === id ? { ...run, status: "APPROVED" } : run));
      setNotice("Payroll aprovado e registado no histórico de auditoria.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível aprovar o Payroll."); }
    finally { setBusy(""); }
  }

  return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">Finance • People</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Payroll</h1><p className="mt-2 text-slate-500">Períodos de processamento, cálculo controlado e aprovação separada.</p></div><OrganizationSelector value={organizationId} onChange={load}/></header>
    {organization&&<div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Organização: <strong className="text-slate-900">{organization.name}</strong> · {organization.organization_type}</div>}
    {error&&<div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice&&<div aria-live="polite" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <form onSubmit={createRun} className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4 md:items-end">
      <div className="md:col-span-4"><h2 className="font-semibold">Novo período</h2><p className="mt-1 text-xs text-slate-500">Requer Payroll Manager. Criar um período não calcula nem aprova pagamentos.</p></div>
      <label className="text-xs text-slate-500">Início<input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
      <label className="text-xs text-slate-500">Fim<input required type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
      <label className="text-xs text-slate-500">Data de pagamento (opcional)<input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
      <button disabled={!organizationId || !periodStart || !periodEnd || !!busy} className="rounded-xl bg-[var(--zion-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy === "create" ? "A criar…" : "Criar rascunho"}</button>
    </form>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Processamentos</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-4">Período</th><th className="p-4">Estado</th><th className="p-4">Bruto</th><th className="p-4">Deduções</th><th className="p-4">Líquido</th><th className="p-4">Ação</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-b last:border-0"><td className="p-4">{run.period_start} → {run.period_end}</td><td className="p-4">{run.status}</td><td className="p-4">{Number(run.gross_total).toLocaleString()} {run.currency_code}</td><td className="p-4">{Number(run.deduction_total).toLocaleString()} {run.currency_code}</td><td className="p-4 font-semibold">{Number(run.net_total).toLocaleString()} {run.currency_code}</td><td className="flex gap-2 p-4">{run.status === "DRAFT"&&<button disabled={busy === run.id} onClick={() => void calculate(run.id)} className="rounded-lg bg-[var(--zion-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === run.id ? "A calcular…" : "Calcular"}</button>}{run.status === "REVIEW"&&<button disabled={busy === run.id} onClick={() => void approve(run.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === run.id ? "A aprovar…" : "Aprovar"}</button>}</td></tr>)}</tbody></table>{!runs.length&&<p className="p-6 text-sm text-slate-500">Nenhum processamento encontrado.</p>}</div></section>
  </div></main>;
}
