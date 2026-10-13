"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type MinistryReportRow = { id: string; title: string; status: string; submitted_at?: string };
type MinistryRow = {
  id: string;
  name: string;
  department: string;
  status: string;
  leadership?: Array<{ id: string; role: string }>;
  programs?: Array<{ id: string; name: string; status: string }>;
  reports?: MinistryReportRow[];
  metrics?: { members?: number };
};
type YouthReport = {
  organization_id: string;
  clubs_total: number;
  clubs_active: number;
  active_members_unique: number;
  activities_total: number;
  activities_upcoming: number;
  activities_completed: number;
  progress_in_progress: number;
  progress_completed: number;
  investitures_requested: number;
  investitures_completed: number;
  attendance_confirmed: number;
  by_program?: Array<{ program_id: string; clubs: number; active_memberships: number; activities: number }>;
};

function count(values: Array<{ status?: string }> | undefined, status: string) {
  return (values ?? []).filter((value) => value.status?.toUpperCase() === status).length;
}

function numberLabel(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-PT") : "—";
}

export default function ReportsPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [ministries, setMinistries] = useState<MinistryRow[]>([]);
  const [ministryDataAvailable, setMinistryDataAvailable] = useState<boolean | null>(null);
  const [youth, setYouth] = useState<YouthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async (id: string, quiet = false) => {
    if (!id) return;
    if (!quiet) setLoading(true);
    setMinistryDataAvailable(null);
    const results = await Promise.allSettled([
      resaRequest<MinistryRow[]>(`/v1/ministries/organization/${encodeURIComponent(id)}`),
      resaRequest<YouthReport>(`/v1/youth/activities/organization/${encodeURIComponent(id)}/report`),
    ]);
    const nextErrors: string[] = [];
    if (results[0].status === "fulfilled") {
      setMinistries(results[0].value);
      setMinistryDataAvailable(true);
    } else {
      setMinistries([]);
      setMinistryDataAvailable(false);
      nextErrors.push("Não foi possível carregar os ministérios e os relatórios associados.");
    }
    if (results[1].status === "fulfilled") setYouth(results[1].value);
    else {
      setYouth(null);
      nextErrors.push("O relatório operacional do Ministério Jovem não respondeu. Confirme a ligação da API e a migração de relatórios.");
    }
    setErrors(nextErrors);
    setLastUpdated(new Date().toISOString());
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    let inFlight = false;
    const load = async (quiet: boolean) => {
      if (inFlight) return;
      inFlight = true;
      await refresh(organizationId, quiet);
      inFlight = false;
    };
    void load(false);
    const interval = setInterval(() => { if (active) void load(true); }, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [organizationId, refresh]);

  const allReports = ministries.flatMap((ministry) => (ministry.reports ?? []).map((report) => ({ ...report, ministryName: ministry.name })));
  const activePrograms = ministries.reduce((total, ministry) => total + count(ministry.programs, "ACTIVE"), 0);
  const pendingReports = count(allReports, "PENDING");
  const approvedReports = count(allReports, "APPROVED");
  const leaders = ministries.reduce((total, ministry) => total + (ministry.leadership?.length ?? 0), 0);
  const members = ministries.reduce((total, ministry) => total + (ministry.metrics?.members ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#0C1A3D] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_28px_90px_rgba(7,17,38,0.16)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#E2C477]">ZION OS · Reporting & Governance</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Centro de relatórios</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Uma visão consolidada dos registos operacionais da organização. Os indicadores são recolhidos dos dados existentes; informação em falta é identificada, nunca substituída por números fictícios.</p>
            </div>
            <div className="relative min-w-0 rounded-2xl border border-white/15 bg-white/[0.07] p-4 lg:min-w-[285px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estado da consulta</p>
              <p className="mt-2 text-sm font-semibold">{loading ? "A recolher dados…" : lastUpdated ? "Dados consultados" : "À espera da organização"}</p>
              <p className="mt-1 text-xs text-slate-400">{lastUpdated ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastUpdated)) : "Selecione uma organização para iniciar"}</p>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xl">
            <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
            {organization && <p className="mt-2 text-xs text-slate-500">Âmbito: <strong className="text-slate-700">{organization.name}</strong> · {organization.organization_type}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refresh(organizationId)} disabled={!organizationId || loading} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-40">{loading ? "A atualizar…" : "Atualizar dados"}</button>
            <button type="button" onClick={() => window.print()} disabled={!organizationId || loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] hover:border-[#C8A24A] disabled:opacity-40">Imprimir / guardar PDF</button>
          </div>
        </section>

        {errors.length > 0 && <div role="alert" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{errors.map((error) => <p key={error}>{error}</p>)}</div>}

        <section>
          <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Resumo executivo</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Indicadores dos registos existentes</h2></div>
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Ministérios", value: ministryDataAvailable ? numberLabel(ministries.length) : "—", detail: "Registados na organização" },
              { label: "Membros nos ministérios", value: ministryDataAvailable ? numberLabel(members) : "—", detail: "Soma das adesões por ministério; pode incluir membros em mais de um" },
              { label: "Liderança registada", value: ministryDataAvailable ? numberLabel(leaders) : "—", detail: "Dirigentes associados" },
              { label: "Programas ativos", value: ministryDataAvailable ? numberLabel(activePrograms) : "—", detail: "Programas com estado ativo" },
              { label: "Relatórios pendentes", value: ministryDataAvailable ? numberLabel(pendingReports) : "—", detail: "Aguardam revisão" },
              { label: "Relatórios aprovados", value: ministryDataAvailable ? numberLabel(approvedReports) : "—", detail: "Registos aprovados" },
              { label: "Clubes jovens ativos", value: numberLabel(youth?.clubs_active), detail: "Ministério Jovem" },
              { label: "Membros jovens únicos", value: numberLabel(youth?.active_members_unique), detail: "Membros ativos deduplicados entre clubes" },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,0.03)] sm:p-5">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0C1A3D]">{item.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Ministérios e relatórios</p><h2 className="mt-1 text-lg font-semibold">Registos disponíveis</h2></div>
            {ministryDataAvailable === false ? <p className="p-6 text-sm text-amber-800">Não foi possível confirmar os ministérios. Atualize os dados ou tente novamente mais tarde.</p> : ministries.length === 0 ? <p className="p-6 text-sm text-slate-500">{organizationId ? "Ainda não existem ministérios registados nesta organização." : "Selecione uma organização."}</p> : (
              <div className="divide-y divide-slate-100">
                {ministries.map((ministry) => (
                  <div key={ministry.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9B7A34]">{ministry.department}</p><h3 className="mt-1 font-semibold">{ministry.name}</h3></div><span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500">{ministry.status}</span></div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>{typeof ministry.metrics?.members === "number" ? numberLabel(ministry.metrics.members) : "—"} membros</span><span>{Array.isArray(ministry.leadership) ? ministry.leadership.length.toLocaleString("pt-PT") : "—"} dirigentes</span><span>{Array.isArray(ministry.programs) ? ministry.programs.length.toLocaleString("pt-PT") : "—"} programas</span><span>{Array.isArray(ministry.reports) ? ministry.reports.length.toLocaleString("pt-PT") : "—"} relatórios</span></div>
                    {(ministry.reports ?? []).length > 0 && <div className="mt-4 space-y-2">{ministry.reports?.map((report) => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><div><p className="text-sm font-medium">{report.title}</p><p className="mt-0.5 text-[10px] text-slate-400">{report.submitted_at ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(report.submitted_at)) : "Data não disponível"}</p></div><span className="text-xs text-slate-500">{report.status}</span></div>)}</div>}
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Ministério Jovem</p>
            <h2 className="mt-1 text-lg font-semibold">Atividades, participação e progressão</h2>
            {!youth ? <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm leading-6 text-slate-500">O relatório jovem não está disponível neste momento. Os restantes dados carregados continuam visíveis; o painel não inventa valores em falta.</p> : (
              <div className="mt-5 space-y-3">
                {[
                  ["Atividades registadas", youth.activities_total],
                  ["Atividades futuras", youth.activities_upcoming],
                  ["Atividades concluídas", youth.activities_completed],
                  ["Presenças confirmadas", youth.attendance_confirmed],
                  ["Progressos em curso", youth.progress_in_progress],
                  ["Progressos concluídos / verificados", youth.progress_completed],
                  ["Investiduras solicitadas", youth.investitures_requested],
                  ["Investiduras concluídas", youth.investitures_completed],
                ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-sm text-slate-500">{label}</span><strong className="text-lg text-[#0C1A3D]">{numberLabel(Number(value))}</strong></div>)}
                {youth.by_program && youth.by_program.length > 0 && <div className="pt-3"><h3 className="text-sm font-semibold">Resumo por programa</h3><div className="mt-3 space-y-2">{youth.by_program.map((program) => <div key={program.program_id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">{program.program_id}</p><p className="mt-1 text-xs text-slate-500">{program.clubs} clubes · {program.active_memberships} adesões ativas · {program.activities} atividades</p></div>)}</div></div>}
              </div>
            )}
          </article>
        </section>

        <footer className="rounded-2xl border border-[#C8A24A]/30 bg-[#FBF8F0] p-5 text-sm leading-6 text-slate-600">
          <strong className="text-[#0C1A3D]">Como funciona:</strong> o centro recolhe os dados reais da API quando a organização é selecionada e volta a consultar os dados a cada minuto enquanto esta página está aberta. Esta atualização da página não equivale à geração de um relatório institucional periódico. Também pode atualizar manualmente ou imprimir/guardar em PDF. A submissão hierárquica para distrito/conferência/união exige um fluxo de destinatários, permissões e aprovação; esta página não declara um envio institucional que ainda não foi confirmado.
        </footer>
      </div>
      <style jsx global>{`@media print { aside, header, button, footer { print-color-adjust: exact; } body { background: white !important; } main { padding: 0 !important; } }`}</style>
    </main>
  );
}
