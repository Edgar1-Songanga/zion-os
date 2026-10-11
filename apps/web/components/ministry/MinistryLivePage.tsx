"use client";

import { useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import MinistryDashboard from "./MinistryDashboard";
import type { Ministry } from "./types";
import {
  ADVENTIST_MINISTRY_CATALOG,
  type MinistryCatalogCategory,
  type MinistryCatalogEntry,
} from "./ministry-catalog";

const CATEGORIES: Array<"Todos" | MinistryCatalogCategory> = [
  "Todos",
  "Juventude",
  "Crianças e Família",
  "Discipulado e Missão",
  "Serviço e Comunidade",
  "Administração e Comunicação",
];

export default function MinistryLivePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("LOCAL_CUSTOM");
  const [creating, setCreating] = useState(false);
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Todos");

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

  async function addCatalogMinistry(entry: MinistryCatalogEntry) {
    if (!organizationId || addingCatalogId) return;
    const alreadyAdded = ministries.some((item) => item.department === entry.id);
    if (alreadyAdded) {
      const existing = ministries.find((item) => item.department === entry.id);
      if (existing) setSelectedId(existing.id);
      return;
    }

    setAddingCatalogId(entry.id);
    setError(null);
    try {
      const created = await resaRequest<Ministry>("/v1/ministries", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          name: entry.name,
          department: entry.id,
          description: entry.summary,
          philosophy: entry.mission,
          cover_image_url: entry.coverImage,
          focus_areas: entry.focusAreas,
          age_range: entry.ageRange ?? null,
          official_url: entry.officialUrl,
          source_label: entry.sourceLabel,
        }),
      });
      setMinistries((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível adicionar este ministério à organização.");
    } finally {
      setAddingCatalogId(null);
    }
  }

  async function createCustomMinistry() {
    if (!organizationId || !name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await resaRequest<Ministry>("/v1/ministries", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          name: name.trim(),
          department: department.trim() || "LOCAL_CUSTOM",
        }),
      });
      setMinistries((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(created.id);
      setName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar o ministério.");
    } finally {
      setCreating(false);
    }
  }

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt");
    return ADVENTIST_MINISTRY_CATALOG.filter((entry) => {
      const matchesCategory = category === "Todos" || entry.category === category;
      const searchable = [entry.name, entry.summary, entry.category, ...entry.focusAreas].join(" ").toLocaleLowerCase("pt");
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, query]);

  const selected = ministries.find((item) => item.id === selectedId) ?? null;

  function handleMinistryUpdated(updated: Ministry) {
    setMinistries((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  }

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#0C1A3D] text-white shadow-sm">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
          <div className="p-7 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E2C477]">Zion · Diretório ministerial</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Cada ministério com uma missão. Cada igreja com uma estrutura.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Um catálogo inicial baseado no Manual da Igreja e nos recursos oficiais da Igreja Adventista. Escolha os ministérios da sua organização, consulte o perfil e acrescente outros quando necessário.
            </p>
            <div className="mt-7 max-w-xl">
              <OrganizationSelector value={organizationId} onChange={(id, org) => { void load(id, org); }} />
            </div>
            {organization && (
              <p className="mt-4 text-sm text-slate-300">
                Organização selecionada: <strong className="text-white">{organization.name}</strong> · {organization.organization_type}
              </p>
            )}
          </div>
          <div className="relative hidden min-h-[260px] overflow-hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85"
              alt="Jovens a participar numa atividade comunitária"
              className="absolute inset-0 h-full w-full object-cover opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C1A3D] via-[#0C1A3D]/35 to-transparent" />
            <div className="absolute bottom-7 left-7 right-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E2C477]">Uma missão partilhada</p>
              <p className="mt-2 text-xl font-medium">Servir. Discipular. Transformar.</p>
            </div>
          </div>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B18B36]">Catálogo base</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Ministérios Adventistas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Os perfis vêm preparados com missão, descrição, áreas de atuação e referência oficial. A fotografia de capa é ilustrativa e pode ser substituída por uma imagem autorizada da igreja.
            </p>
          </div>
          <div className="text-sm text-slate-500">{filteredCatalog.length} perfis no catálogo</div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar ministérios, missão ou áreas de atuação…"
            aria-label="Pesquisar catálogo de ministérios"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={"whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition " + (category === item ? "border-[#0C1A3D] bg-[#0C1A3D] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((entry) => {
            const registered = ministries.find((item) => item.department === entry.id);
            const isAdding = addingCatalogId === entry.id;
            return (
              <article key={entry.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img src={entry.coverImage} alt={`Fotografia ilustrativa: ${entry.name}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071126]/85 via-transparent to-black/10" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    {entry.category}
                  </span>
                  <h3 className="absolute bottom-4 left-4 right-4 text-xl font-semibold text-white">{entry.name}</h3>
                </div>
                <div className="flex h-full flex-col p-5">
                  <p className="text-sm leading-6 text-slate-600">{entry.summary}</p>
                  {entry.ageRange && <p className="mt-3 text-xs font-medium text-slate-500">{entry.ageRange}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.focusAreas.slice(0, 3).map((focus) => (
                      <span key={focus} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">{focus}</span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <a href={entry.officialUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#0C1A3D] underline decoration-[#C8A24A] underline-offset-4">
                      Fonte oficial
                    </a>
                    <span className="flex-1" />
                    {organization ? (
                      <button
                        type="button"
                        disabled={Boolean(addingCatalogId) || Boolean(registered)}
                        onClick={() => void addCatalogMinistry(entry)}
                        className="rounded-xl bg-[#0C1A3D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#182c58] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {registered ? "Já adicionado" : isAdding ? "A adicionar…" : "Adicionar à igreja"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Selecione uma organização</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredCatalog.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Não encontrámos ministérios com esses critérios.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B18B36]">Organização selecionada</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Ministérios registados</h2>
        </div>

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar ministérios…</div>}

        {!loading && organization && ministries.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="text-lg font-semibold text-[#0C1A3D]">Ainda não existem ministérios associados</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Escolha os ministérios do catálogo acima para os registar nesta organização. A adição cria um registo no backend; não insere membros ou dirigentes fictícios.</p>
          </div>
        )}

        {!loading && ministries.length > 0 && (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ministries.map((ministry) => (
                <button key={ministry.id} type="button" onClick={() => setSelectedId(ministry.id)}
                  className={"rounded-2xl border p-5 text-left transition " + (selectedId === ministry.id ? "border-[#C8A24A] bg-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300")}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{ministry.department || "MINISTRY"}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#0C1A3D]">{ministry.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{ministry.metrics?.members ?? 0} membros · {ministry.programs?.length ?? 0} programas</p>
                </button>
              ))}
            </div>
            {selected && <MinistryDashboard ministry={selected} onUpdated={handleMinistryUpdated} />}
          </>
        )}

        {organization && (
          <details className="rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#0C1A3D]">Adicionar um ministério local ou personalizado</summary>
            <p className="mt-2 text-sm text-slate-500">Use esta opção para uma iniciativa local que ainda não esteja no catálogo. O nome e a descrição devem respeitar as orientações da organização.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do ministério" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#C8A24A]" />
              <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Categoria / código local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#C8A24A]" />
              <button type="button" onClick={() => void createCustomMinistry()} disabled={!name.trim() || creating} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{creating ? "A registar…" : "Registar"}</button>
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
