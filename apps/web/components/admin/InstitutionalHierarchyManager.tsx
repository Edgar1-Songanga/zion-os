"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type OrganizationType = "GENERAL_CONFERENCE" | "DIVISION" | "UNION" | "CONFERENCE" | "MISSION";
type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType | "LOCAL_CHURCH";
  parent_id: string | null;
  is_active: boolean;
};

const labels: Record<string, string> = {
  GENERAL_CONFERENCE: "Associação Geral",
  DIVISION: "Divisão",
  UNION: "União",
  CONFERENCE: "Associação",
  MISSION: "Missão",
  LOCAL_CHURCH: "Igreja local",
};
const parentTypes: Record<OrganizationType, string[]> = {
  GENERAL_CONFERENCE: [],
  DIVISION: ["GENERAL_CONFERENCE"],
  UNION: ["DIVISION"],
  CONFERENCE: ["UNION"],
  MISSION: ["UNION"],
};

export default function InstitutionalHierarchyManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<OrganizationType>("GENERAL_CONFERENCE");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const eligibleParents = useMemo(
    () => organizations.filter((organization) => parentTypes[type].includes(organization.organization_type)),
    [organizations, type],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await resaRequest<Organization[]>("/v1/organizations/institutional");
      setOrganizations(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a estrutura institucional.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (type === "GENERAL_CONFERENCE") {
      setParentId("");
      return;
    }
    if (!eligibleParents.some((organization) => organization.id === parentId)) {
      setParentId("");
    }
  }, [type, eligibleParents, parentId]);

  async function create() {
    if (!name.trim() || !slug.trim() || saving) return;
    if (type !== "GENERAL_CONFERENCE" && !parentId) {
      setError("Selecione a organização imediatamente superior.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await resaRequest<Organization>("/v1/organizations/institutional", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          organization_type: type,
          parent_id: parentId || null,
        }),
      });
      setOrganizations((current) => [...current, created]);
      setName("");
      setSlug("");
      setNotice("Organização institucional registada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar a organização.");
    } finally {
      setSaving(false);
    }
  }

  const byId = new Map(organizations.map((organization) => [organization.id, organization]));
  const sorted = [...organizations].sort((a, b) => {
    const rank = (value: string) => ["GENERAL_CONFERENCE", "DIVISION", "UNION", "CONFERENCE", "MISSION", "LOCAL_CHURCH"].indexOf(value);
    return rank(a.organization_type) - rank(b.organization_type) || a.name.localeCompare(b.name);
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Administração global ZION</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0C1A3D]">Hierarquia institucional</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Registe as estruturas institucionais e ligue cada nível ao seu superior. A autorização é validada novamente pela API e pela base de dados.</p>
          </div>
          <Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voltar à administração</Link>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Registar estrutura institucional</h2>
          <p className="mt-1 text-sm text-slate-500">A criação de organizações institucionais exige uma conta global verificada.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">Tipo institucional
              <select value={type} onChange={(event) => setType(event.target.value as OrganizationType)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5">
                <option value="GENERAL_CONFERENCE">Associação Geral</option>
                <option value="DIVISION">Divisão</option>
                <option value="UNION">União</option>
                <option value="CONFERENCE">Associação</option>
                <option value="MISSION">Missão</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Organização superior
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={type === "GENERAL_CONFERENCE"} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-100">
                <option value="">{type === "GENERAL_CONFERENCE" ? "Sem superior" : "Selecionar organização superior…"}</option>
                {eligibleParents.map((organization) => <option key={organization.id} value={organization.id}>{labels[organization.organization_type]} — {organization.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Nome oficial
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da organização" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Identificador (slug)
              <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="ex.: uniao-angola" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <button type="button" onClick={() => void create()} disabled={saving || loading || !name.trim() || !slug.trim() || (type !== "GENERAL_CONFERENCE" && !parentId)} className="mt-5 rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving ? "A registar…" : "Registar organização"}</button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-[#0C1A3D]">Estruturas registadas</h2><p className="mt-1 text-sm text-slate-500">Hierarquia institucional existente, sem alterar registos históricos.</p></div>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Atualizar</button>
          </div>
          {loading ? <p className="mt-5 text-sm text-slate-500">A carregar estrutura…</p> : sorted.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ainda não existem estruturas institucionais registadas.</p> : (
            <div className="mt-5 divide-y divide-slate-100">
              {sorted.map((organization) => {
                const parent = organization.parent_id ? byId.get(organization.parent_id) : null;
                return <article key={organization.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{labels[organization.organization_type] ?? organization.organization_type}</p><h3 className="mt-1 font-semibold text-[#0C1A3D]">{organization.name}</h3><p className="mt-1 text-xs text-slate-500">{parent ? `Superior: ${parent.name}` : "Nível superior / sem organização superior"} · /​{organization.slug}</p></div>
                  <span className={organization.is_active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>{organization.is_active ? "Ativa" : "Inativa"}</span>
                </article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
