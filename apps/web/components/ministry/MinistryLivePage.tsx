"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import MinistryDashboard from "./MinistryDashboard";
import type { Ministry } from "./types";

export default function MinistryLivePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string, org: ZionOrganization) {
    setOrganizationId(id);
    setOrganization(org);
    setSelectedId("");
    setMinistries([]);
    setError(null);
    setLoading(true);
    try {
      const result = await resaRequest<Ministry[]>(`/v1/ministries/organization/${id}`);
      setMinistries(result);
      setSelectedId(result[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os ministérios.");
    } finally {
      setLoading(false);
    }
  }

  const selected = ministries.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zion-gold)]">Spiritual organization</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Ministérios</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Ministério Jovem e os demais ministérios institucionais são carregados do diretório real da organização selecionada.</p>
        </div>
        <OrganizationSelector value={organizationId} onChange={(id, org) => { setOrganizationId(id); setOrganization(org); void load(id, org); }} />
      </header>

      {organization && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Organização: <strong className="text-slate-900">{organization.name}</strong> · {organization.organization_type}
        </div>
      )}

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar ministérios…</div>}

      {!loading && organization && !ministries.length && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--zion-dark)]">Nenhum ministério registado</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            O diretório está ligado ao backend, mas esta organização ainda não possui ministérios registados. Não foram inseridos dados fictícios.
          </p>
        </div>
      )}

      {!loading && ministries.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ministries.map((ministry) => (
              <button key={ministry.id} type="button" onClick={() => setSelectedId(ministry.id)}
                className={"rounded-2xl border p-5 text-left transition " + (selectedId === ministry.id ? "border-[#C8A24A] bg-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300")}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{ministry.department || "MINISTRY"}</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--zion-dark)]">{ministry.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{ministry.metrics?.members ?? 0} membros · {ministry.programs?.length ?? 0} programas</p>
              </button>
            ))}
          </div>
          {selected && <MinistryDashboard ministry={selected} />}
        </>
      )}
    </div>
  );
}
