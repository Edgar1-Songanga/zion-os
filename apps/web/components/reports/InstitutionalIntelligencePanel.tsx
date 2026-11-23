"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type OrganizationMetric = {
  id: string;
  name: string;
  organization_type: string;
  is_active: boolean;
  depth: number;
  active_departments: number;
  active_ministries: number;
  active_programs: number;
  pending_ministry_reports: number;
  approved_ministry_reports: number;
};

type IntelligenceResponse = {
  status: "LIVE_AGGREGATE";
  generated_at: string;
  scope: {
    root_organization_id: string;
    root_organization_name: string;
    root_organization_type: string;
    included_organizations: number;
  };
  metrics: {
    active_organizations: number;
    active_departments: number;
    active_ministries: number;
    active_programs: number;
    pending_ministry_reports: number;
    approved_ministry_reports: number;
    active_church_members: { value: number | null; status: "AVAILABLE" | "SUPPRESSED"; minimum_group_size: number };
  };
  by_organization: OrganizationMetric[];
  data_quality: {
    membership_aggregate: string;
    historical_comparison: string;
    forecasting: string;
    data_as_of: string | null;
  };
  lineage: Record<string, string>;
};

const numberFormat = new Intl.NumberFormat("pt-PT");
const primaryMetrics: Array<{ key: keyof IntelligenceResponse["metrics"]; label: string; description: string }> = [
  { key: "active_organizations", label: "Organizações activas", description: "No âmbito autorizado" },
  { key: "active_ministries", label: "Ministérios activos", description: "Com estado ACTIVE" },
  { key: "pending_ministry_reports", label: "Relatórios pendentes", description: "Aguardam apreciação" },
];
const secondaryMetrics: Array<{ key: keyof IntelligenceResponse["metrics"]; label: string }> = [
  { key: "active_departments", label: "Departamentos" },
  { key: "active_programs", label: "Programas" },
  { key: "approved_ministry_reports", label: "Relatórios aprovados" },
];

export default function InstitutionalIntelligencePanel({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) { setData(null); setError(""); return; }
    let active = true;
    setLoading(true);
    setError("");
    void resaRequest<IntelligenceResponse>(`/v1/platform/analytics/institutional?organization_id=${encodeURIComponent(organizationId)}`)
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => {
        if (!active) return;
        setData(null);
        const message = reason instanceof Error ? reason.message : "";
        setError(/42501|permission|forbidden|not authorized/i.test(message)
          ? "A sua função não tem autorização para consultar a inteligência institucional neste âmbito."
          : "Não foi possível obter os indicadores institucionais. Verifique a ligação e tente novamente.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId]);

  if (!organizationId) return null;

  return (
    <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">ZION · Institutional Intelligence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0C1A3D] sm:text-2xl">Inteligência institucional</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Indicadores agregados calculados no PostgreSQL, limitados à hierarquia que a sua função está autorizada a consultar.</p>
        </div>
        <div className="text-xs text-slate-500">
          {loading ? "A actualizar…" : data ? `Actualizado ${new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generated_at))}` : "A aguardar dados"}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {loading && !data && <div className="grid gap-3 lg:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-slate-100" /><div className="h-28 animate-pulse rounded-2xl bg-slate-100" /><div className="h-28 animate-pulse rounded-2xl bg-slate-100" /></div>}
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Âmbito: <strong className="text-slate-700">{data.scope.root_organization_name}</strong></span>
            <span>{numberFormat.format(data.scope.included_organizations)} organizações incluídas</span>
            <span>Dados até: {data.data_quality.data_as_of ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.data_quality.data_as_of)) : "Sem actividade registada"}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {primaryMetrics.map((metric, index) => (
              <article key={metric.key} className={index === 0 ? "relative overflow-hidden rounded-2xl border border-[#19385B] bg-[#0B2544] p-5 text-white shadow-[0_12px_30px_rgba(7,21,43,0.12)]" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.03)]"}>
                <p className={index === 0 ? "text-xs font-medium text-slate-300" : "text-xs font-medium text-slate-500"}>{metric.label}</p>
                <p className={"mt-3 text-3xl font-semibold tracking-tight tabular-nums " + (index === 0 ? "text-[#E2C477]" : "text-[#0C1A3D]")}>{numberFormat.format(data.metrics[metric.key] as number)}</p>
                <p className="mt-1 text-xs text-slate-400">{metric.description}</p>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-4">
            {secondaryMetrics.map((metric, index) => (
              <div key={metric.key} className={"px-4 py-4 sm:px-5 " + (index > 0 ? "sm:border-l sm:border-slate-100" : "")}>
                <p className="text-[11px] font-medium text-slate-500">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[#0C1A3D]">{numberFormat.format(data.metrics[metric.key] as number)}</p>
              </div>
            ))}
            <div className="border-t border-slate-100 px-4 py-4 sm:border-l sm:border-t-0 sm:px-5">
              <p className="text-[11px] font-medium text-slate-500">Membros activos</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-[#0C1A3D]">{data.metrics.active_church_members.value === null ? "—" : numberFormat.format(data.metrics.active_church_members.value)}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">{data.metrics.active_church_members.value === null ? "Protegido por privacidade" : "Cadastro oficial"}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-[#0C1A3D]">Desempenho operacional por organização</h3>
              <p className="mt-1 text-xs text-slate-500">Valores agregados; não inclui dados individuais de membros nem conteúdos dos relatórios.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Organização</th>
                    <th className="px-3 py-3 font-semibold">Departamentos</th>
                    <th className="px-3 py-3 font-semibold">Ministérios</th>
                    <th className="px-3 py-3 font-semibold">Programas</th>
                    <th className="px-3 py-3 font-semibold">Pendentes</th>
                    <th className="px-3 py-3 font-semibold">Aprovados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.by_organization.map((item) => (
                    <tr key={item.id} className="text-slate-600">
                      <td className="px-4 py-3"><span className="font-medium text-slate-800">{item.name}</span><span className="ml-2 text-[10px] text-slate-400">{item.organization_type.replaceAll("_", " ")}</span></td>
                      <td className="px-3 py-3 tabular-nums">{numberFormat.format(item.active_departments)}</td>
                      <td className="px-3 py-3 tabular-nums">{numberFormat.format(item.active_ministries)}</td>
                      <td className="px-3 py-3 tabular-nums">{numberFormat.format(item.active_programs)}</td>
                      <td className="px-3 py-3 tabular-nums">{numberFormat.format(item.pending_ministry_reports)}</td>
                      <td className="px-3 py-3 tabular-nums">{numberFormat.format(item.approved_ministry_reports)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">Qualidade e privacidade</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Membresia: {data.data_quality.membership_aggregate === "AVAILABLE" ? "agregado disponível" : "agregado protegido pelo limiar mínimo de cinco registos"}.</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Comparação histórica indisponível: ainda não existe base histórica validada para estes indicadores.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Metodologia e actualidade</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Cálculo no servidor · versão {data.lineage.calculation_version} · gerado {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generated_at))}.</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Previsões e recomendações automáticas permanecem desactivadas até existir histórico suficiente e validado.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
