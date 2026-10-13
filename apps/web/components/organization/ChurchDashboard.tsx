"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type MinistryReport = { id: string; title: string; status: string; submitted_at?: string };
type Ministry = {
  id: string;
  name: string;
  department?: string;
  status?: string;
  leadership?: Array<{ id: string; role: string }>;
  programs?: Array<{ id: string; name: string; status: string }>;
  reports?: MinistryReport[];
  metrics?: { members?: number };
};
type Membership = { id: string; user_id: string; status?: string; role_id?: string };
type YouthReport = {
  clubs_total?: number;
  clubs_active?: number;
  active_members_unique?: number;
  activities_total?: number;
  activities_upcoming?: number;
  activities_completed?: number;
};

function formatNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-PT")
    : "—";
}

function countStatus(values: Array<{ status?: string }> | undefined, expected: string) {
  return (values ?? []).filter((item) => item.status?.toUpperCase() === expected).length;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.03)]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0C1A3D]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
}

export default function ChurchDashboard() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [youth, setYouth] = useState<YouthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    const results = await Promise.allSettled([
      resaRequest<Ministry[]>(`/v1/ministries/organization/${encodeURIComponent(id)}`),
      resaRequest<Membership[]>(`/v1/organizations/${encodeURIComponent(id)}/memberships`),
      resaRequest<YouthReport>(`/v1/youth/activities/organization/${encodeURIComponent(id)}/report`),
    ]);

    const nextErrors: string[] = [];
    if (results[0].status === "fulfilled") setMinistries(results[0].value);
    else {
      setMinistries([]);
      nextErrors.push("Não foi possível carregar os ministérios desta organização.");
    }
    if (results[1].status === "fulfilled") setMemberships(results[1].value);
    else {
      setMemberships(null);
      nextErrors.push("Não foi possível carregar as associações de acesso à organização.");
    }
    if (results[2].status === "fulfilled") setYouth(results[2].value);
    else {
      setYouth(null);
      nextErrors.push("O relatório operacional do Ministério Jovem não está disponível neste momento.");
    }

    setErrors(nextErrors);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (organizationId) void refresh(organizationId);
  }, [organizationId, refresh]);

  const allReports = ministries.flatMap((ministry) =>
    (ministry.reports ?? []).map((report) => ({ ...report, ministryName: ministry.name })),
  );
  const activeMinistries = ministries.filter((ministry) => ministry.status?.toLowerCase() === "active").length;
  const pendingReports = countStatus(allReports, "PENDING");
  const approvedReports = countStatus(allReports, "APPROVED");
  const activeMemberships = memberships?.filter((membership) => membership.status?.toUpperCase() === "ACTIVE").length;

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#0C1A3D] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_28px_90px_rgba(7,17,38,0.16)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#E2C477]">ZION OS · Administração da Igreja</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Painel da Igreja</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Visão operacional baseada nos registos disponíveis. Os indicadores não confirmados são apresentados como indisponíveis, nunca como números inventados.
              </p>
            </div>
            <div className="relative min-w-0 rounded-2xl border border-white/15 bg-white/[0.07] p-4 lg:min-w-[285px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estado dos dados</p>
              <p className="mt-2 text-sm font-semibold">{loading ? "A recolher dados…" : lastUpdated ? "Consulta concluída" : "Selecione uma organização"}</p>
              <p className="mt-1 text-xs text-slate-400">
                {lastUpdated ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastUpdated)) : "Os dados serão carregados após a seleção"}
              </p>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xl">
            <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
            {organization && <p className="mt-2 text-xs text-slate-500">Âmbito: <strong className="text-slate-700">{organization.name}</strong> · {organization.organization_type}</p>}
          </div>
          <button
            type="button"
            onClick={() => void refresh(organizationId)}
            disabled={!organizationId || loading}
            className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-40"
          >
            {loading ? "A atualizar…" : "Atualizar dados"}
          </button>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}

        <section>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Resumo executivo</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Indicadores da organização</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <MetricCard label="Associações ativas" value={formatNumber(activeMemberships)} detail="Acessos associados à organização; não equivale ao cadastro oficial de membros da Igreja." />
            <MetricCard label="Ministérios ativos" value={formatNumber(activeMinistries)} detail="Ministérios cujo estado está registado como ativo." />
            <MetricCard label="Relatórios pendentes" value={formatNumber(allReports.length ? pendingReports : ministries.length ? 0 : undefined)} detail="Relatórios associados aos ministérios que aguardam revisão." />
            <MetricCard label="Relatórios aprovados" value={formatNumber(allReports.length ? approvedReports : ministries.length ? 0 : undefined)} detail="Relatórios associados aos ministérios aprovados." />
            <MetricCard label="Clubes jovens ativos" value={formatNumber(youth?.clubs_active)} detail="Clubes ativos segundo o relatório operacional do Ministério Jovem." />
            <MetricCard label="Atividades jovens" value={formatNumber(youth?.activities_total)} detail={youth ? `${formatNumber(youth.activities_upcoming)} futuras · ${formatNumber(youth.activities_completed)} concluídas` : "Relatório operacional indisponível."} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Atividade departamental</p>
              <h2 className="mt-2 text-xl font-semibold">Ministérios e relatórios recentes</h2>
            </div>
            <p className="text-xs text-slate-500">{ministries.length.toLocaleString("pt-PT")} ministério(s) carregado(s)</p>
          </div>

          {!organizationId ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Selecione uma organização para consultar os seus dados.</p>
          ) : ministries.length === 0 && !loading ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Não há ministérios para apresentar ou os dados ainda não puderam ser carregados.</p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {ministries.map((ministry) => (
                <article key={ministry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[#0C1A3D]">{ministry.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{ministry.department || "Departamento não especificado"} · {ministry.programs?.length ?? 0} programa(s)</p>
                    {(ministry.reports ?? []).length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {ministry.reports?.slice(0, 3).map((report) => (
                          <li key={report.id} className="text-sm text-slate-600">
                            <span className="font-medium">{report.title}</span>
                            <span className="ml-2 text-xs text-slate-400">{report.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="w-fit rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    {ministry.status || "Estado não informado"}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Nota: este painel consulta dados existentes quando é aberto e quando se seleciona “Atualizar dados”. A compilação automática periódica e a submissão hierárquica de relatórios ainda não são implementadas por esta alteração.
        </p>
      </div>
    </main>
  );
}
