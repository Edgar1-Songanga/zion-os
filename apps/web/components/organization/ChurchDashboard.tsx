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
type OrganizationUnit = { id: string; organization_id: string; parent_id: string | null; name: string; unit_type: string; description: string | null; is_active: boolean };
type OrganizationNode = { id: string; name: string; organization_type: string; parent_id: string | null };
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
  const [units, setUnits] = useState<OrganizationUnit[] | null>(null);
  const [organizationTree, setOrganizationTree] = useState<OrganizationNode[] | null>(null);
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
      resaRequest<OrganizationUnit[]>(`/v1/organizations/${encodeURIComponent(id)}/units`),
      resaRequest<OrganizationNode[]>("/v1/organizations"),
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

    if (results[3].status === "fulfilled") setUnits(results[3].value);
    else {
      setUnits(null);
      nextErrors.push("A estrutura interna (unidades/departamentos) não pôde ser carregada.");
    }
    if (results[4].status === "fulfilled") setOrganizationTree(results[4].value);
    else {
      setOrganizationTree(null);
      nextErrors.push("A hierarquia institucional acessível não pôde ser carregada.");
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
  const reportsDataAvailable = ministries.length > 0 && ministries.every((ministry) => Array.isArray(ministry.reports));
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
            <MetricCard label="Relatórios pendentes" value={formatNumber(reportsDataAvailable ? pendingReports : undefined)} detail="Relatórios associados aos ministérios que aguardam revisão." />
            <MetricCard label="Relatórios aprovados" value={formatNumber(reportsDataAvailable ? approvedReports : undefined)} detail="Relatórios associados aos ministérios aprovados." />
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

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Estrutura institucional</p>
            <h2 className="mt-2 text-xl font-semibold">Organizações acessíveis</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Mostra apenas organizações devolvidas pela API para a sua sessão. Relações superiores não são inventadas quando não estão acessíveis.</p>
            {!organizationTree ? <p className="mt-4 text-sm text-slate-500">Estrutura indisponível.</p> : organizationTree.length === 0 ? <p className="mt-4 text-sm text-slate-500">Não existem organizações acessíveis nesta sessão.</p> : (
              <div className="mt-4 space-y-2">
                {organizationTree.map((item) => {
                  const parent = item.parent_id ? organizationTree.find((candidate) => candidate.id === item.parent_id) : null;
                  return <div key={item.id} className={`rounded-xl border p-3 ${item.id === organizationId ? "border-[#C8A24A] bg-[#FBF8F0]" : "border-slate-100 bg-slate-50"}`}>
                    <p className="font-semibold text-[#0C1A3D]">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.organization_type}{parent ? ` · Unidade superior: ${parent.name}` : item.parent_id ? " · Unidade superior fora da lista acessível" : " · Sem unidade superior registada"}</p>
                  </div>;
                })}
              </div>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Estrutura local</p>
            <h2 className="mt-2 text-xl font-semibold">Unidades e departamentos</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Unidades realmente registadas para a organização selecionada. A tipologia pode ser configurada conforme a estrutura usada em cada país.</p>
            {!organizationId ? <p className="mt-4 text-sm text-slate-500">Selecione uma organização.</p> : units === null ? <p className="mt-4 text-sm text-slate-500">Unidades indisponíveis ou sem permissão de leitura.</p> : units.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Ainda não há unidades/departamentos registados nesta organização.</p> : (
              <div className="mt-4 space-y-2">
                {units.map((unit) => {
                  const parent = unit.parent_id ? units.find((candidate) => candidate.id === unit.parent_id) : null;
                  return <div key={unit.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#0C1A3D]">{unit.name}</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">{unit.unit_type}</span></div>
                    <p className="mt-1 text-xs text-slate-500">{parent ? `Subunidade de ${parent.name}` : unit.parent_id ? "Unidade superior não devolvida pela API" : "Unidade de nível superior"} · {unit.is_active ? "Ativa" : "Inativa"}</p>
                    {unit.description && <p className="mt-2 text-sm leading-5 text-slate-600">{unit.description}</p>}
                  </div>;
                })}
              </div>
            )}
          </article>
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Nota: este painel consulta dados existentes quando é aberto e quando se seleciona “Atualizar dados”. A compilação automática periódica e a submissão hierárquica de relatórios ainda não são implementadas por esta alteração.
        </p>
      </div>
    </main>
  );
}
