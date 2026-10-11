"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import { YOUTH_PROGRAMS } from "@/components/youth/core/YouthProgram";

type Club = { id: string; organizationId: string; name: string; programId: string; status: "ACTIVE" | "INACTIVE" };
type ClubMember = { userId: string; status: "ACTIVE" | "INACTIVE" };
type CatalogItem = {
  id: string; organization_id: string; program_id: string; kind: "CLASS" | "SPECIALTY";
  code: string; name: string; description: string; level: string; prerequisites: string[];
  official_reference_url?: string | null; is_active: boolean;
};
type ProgressItem = {
  id: string; user_id: string; status: "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "RETURNED";
  notes: string; evidence_url?: string | null; catalog?: CatalogItem;
};
type Investiture = {
  id: string; user_id: string; class_catalog_id: string; scheduled_date?: string | null;
  location: string; notes: string; status: "REQUESTED" | "APPROVED" | "COMPLETED" | "CANCELLED";
  class?: CatalogItem;
};
type Profile = { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null };

const emptyCatalog = { kind: "CLASS" as "CLASS" | "SPECIALTY", code: "", name: "", description: "", level: "", official_reference_url: "" };
const emptyInvestiture = { user_id: "", class_catalog_id: "", scheduled_date: "", location: "", notes: "" };

function displayName(profile?: Profile) {
  return profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Membro";
}

export default function YouthProgressionOperations() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [investitures, setInvestitures] = useState<Investiture[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [catalogForm, setCatalogForm] = useState(emptyCatalog);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [investitureForm, setInvestitureForm] = useState(emptyInvestiture);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const activeMembers = members.filter((member) => member.status === "ACTIVE");
  const classes = useMemo(() => catalog.filter((item) => item.kind === "CLASS" && item.is_active), [catalog]);
  const activeCatalog = useMemo(() => catalog.filter((item) => item.is_active), [catalog]);

  async function selectOrganization(id: string, selected: ZionOrganization) {
    setOrganization(selected);
    setOrganizationId(id);
    setError(null);
    setMessage(null);
    setLoading(true);
    setClubId("");
    setClubs([]);
    setMembers([]);
    setCatalog([]);
    setProgress([]);
    setInvestitures([]);
    try {
      const rows = await resaRequest<Club[]>(`/v1/youth/clubs/organization/${encodeURIComponent(id)}`);
      const active = rows.filter((club) => club.status === "ACTIVE");
      setClubs(active);
      setClubId(active[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os clubes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedClub) return;
    let current = true;
    setLoading(true);
    setError(null);
    Promise.all([
      resaRequest<ClubMember[]>(`/v1/youth/clubs/${encodeURIComponent(selectedClub.id)}/members`),
      resaRequest<CatalogItem[]>(`/v1/youth/progression/catalog/organization/${encodeURIComponent(selectedClub.organizationId)}?program_id=${encodeURIComponent(selectedClub.programId)}`),
      resaRequest<ProgressItem[]>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/progress`),
      resaRequest<Investiture[]>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/investitures`),
      resaRequest<{ members: Array<{ user_id: string; profile: Profile | null }>; leaders: Array<{ user_id: string; profile: Profile | null }> }>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/people`),
    ]).then(async ([memberRows, catalogRows, progressRows, investitureRows, people]) => {
      if (!current) return;
      setMembers(memberRows);
      setCatalog(catalogRows);
      setProgress(progressRows);
      setInvestitures(investitureRows);
      const resolvedProfiles = [...people.members, ...people.leaders]
        .map((person) => person.profile)
        .filter((profile): profile is Profile => profile !== null);
      if (current) setProfiles((previous) => ({ ...previous, ...Object.fromEntries(resolvedProfiles.map((profile) => [profile.id, profile])) }));
    }).catch((reason) => {
      if (current) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a progressão deste clube.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [clubId, selectedClub?.organizationId, selectedClub?.programId]);

  async function saveCatalogItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClub || saving) return;
    setSaving(true); setError(null); setMessage(null);
    const payload = {
      code: catalogForm.code,
      name: catalogForm.name,
      description: catalogForm.description,
      level: catalogForm.level,
      official_reference_url: catalogForm.official_reference_url.trim() || null,
    };
    try {
      const item = await resaRequest<CatalogItem>(
        editingCatalogId
          ? `/v1/youth/progression/catalog/${encodeURIComponent(editingCatalogId)}`
          : `/v1/youth/progression/catalog/organization/${encodeURIComponent(organizationId)}`,
        {
          method: editingCatalogId ? "PATCH" : "POST",
          body: JSON.stringify(editingCatalogId ? payload : { ...payload, program_id: selectedClub.programId, kind: catalogForm.kind }),
        },
      );
      setCatalog((items) => {
        const next = editingCatalogId ? items.map((current) => current.id === item.id ? item : current) : [...items, item];
        return next.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
      });
      setCatalogForm(emptyCatalog);
      setEditingCatalogId(null);
      setMessage(editingCatalogId ? "Elemento curricular atualizado." : "Elemento curricular guardado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o elemento curricular.");
    } finally { setSaving(false); }
  }

  function editCatalogItem(item: CatalogItem) {
    setEditingCatalogId(item.id);
    setCatalogForm({
      kind: item.kind,
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      level: item.level ?? "",
      official_reference_url: item.official_reference_url ?? "",
    });
    setError(null);
    setMessage(null);
  }

  async function toggleCatalogItem(item: CatalogItem) {
    if (saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await resaRequest<CatalogItem>(`/v1/youth/progression/catalog/${encodeURIComponent(item.id)}`, {
        method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }),
      });
      setCatalog((items) => items.map((current) => current.id === item.id ? { ...current, ...updated } : current));
      setMessage(updated.is_active ? "Elemento curricular reativado." : "Elemento curricular desativado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar o estado do elemento curricular.");
    } finally { setSaving(false); }
  }

  async function assignProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClub || !memberId || !catalogItemId || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await resaRequest(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/progress`, {
        method: "POST", body: JSON.stringify({ user_id: memberId, catalog_item_id: catalogItemId }),
      });
      const rows = await resaRequest<ProgressItem[]>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/progress`);
      setProgress(rows); setMessage("Progresso associado ao membro.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível associar o progresso.");
    } finally { setSaving(false); }
  }

  async function changeProgress(id: string, status: ProgressItem["status"]) {
    if (saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await resaRequest<ProgressItem>(`/v1/youth/progression/progress/${encodeURIComponent(id)}`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setProgress((items) => items.map((item) => item.id === id ? { ...item, ...updated } : item));
      setMessage(status === "VERIFIED" ? "Progresso verificado." : "Estado do progresso atualizado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o progresso.");
    } finally { setSaving(false); }
  }

  async function requestInvestiture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClub || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await resaRequest(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/investitures`, {
        method: "POST", body: JSON.stringify({
          ...investitureForm, scheduled_date: investitureForm.scheduled_date || null,
        }),
      });
      const rows = await resaRequest<Investiture[]>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/investitures`);
      setInvestitures(rows); setInvestitureForm(emptyInvestiture); setMessage("Pedido de investidura registado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar a investidura.");
    } finally { setSaving(false); }
  }

  async function changeInvestiture(item: Investiture, status: Investiture["status"]) {
    if (saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await resaRequest<Investiture>(`/v1/youth/progression/investitures/${encodeURIComponent(item.id)}`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setInvestitures((items) => items.map((current) => current.id === item.id ? { ...current, ...updated } : current));
      setMessage("Estado da investidura atualizado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a investidura.");
    } finally { setSaving(false); }
  }

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Formação e reconhecimento</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">Classes, especialidades e investiduras</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Crie o catálogo curricular aprovado pela organização, acompanhe o progresso individual e registe pedidos e decisões de investidura. O Zion não pré-carrega requisitos oficiais não confirmados.</p>
        </div>
        <OrganizationSelector value={organizationId} onChange={(id, org) => void selectOrganization(id, org)} />
      </div>
      {organization && <p className="mt-2 text-xs text-slate-500">Organização: <strong className="text-slate-700">{organization.name}</strong></p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {organizationId && (
        <div className="mt-6">
          <label className="block max-w-xl text-sm font-medium text-slate-700">Clube ativo
            <select value={clubId} onChange={(event) => setClubId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              {clubs.length === 0 && <option value="">Nenhum clube ativo disponível</option>}
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name} · {YOUTH_PROGRAMS.find((program) => program.id === club.programId)?.name ?? club.programId}</option>)}
            </select>
          </label>
        </div>
      )}
      {loading ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">A carregar dados operacionais…</p> : selectedClub && (
        <div className="mt-7 space-y-8">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-[#0C1A3D]">Catálogo curricular</h3>
              <p className="mt-1 text-sm text-slate-500">Itens disponíveis para {selectedClub.name}.</p>
              <div className="mt-4 space-y-2">
                {catalog.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Ainda não há classes ou especialidades cadastradas para este programa.</p> : catalog.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#9B7A34]">{item.kind === "CLASS" ? "Classe" : "Especialidade"} · {item.code}</p><p className="mt-1 font-semibold text-slate-800">{item.name}</p>{item.level && <p className="text-xs text-slate-500">Nível: {item.level}</p>}{item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}{item.official_reference_url && <a className="mt-1 inline-block text-xs text-blue-700 underline" href={item.official_reference_url} target="_blank" rel="noreferrer">Referência</a>}</div>
                    <div className="flex shrink-0 flex-col gap-2"><span className={item.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-center text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-center text-xs text-slate-500"}>{item.is_active ? "Ativo" : "Inativo"}</span><button type="button" onClick={() => editCatalogItem(item)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#0C1A3D]">Editar</button><button type="button" disabled={saving} onClick={() => void toggleCatalogItem(item)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 disabled:opacity-50">{item.is_active ? "Desativar" : "Reativar"}</button></div>
                  </div>
                ))}
              </div>
              <form onSubmit={saveCatalogItem} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <h4 className="font-semibold text-[#0C1A3D]">{editingCatalogId ? "Editar elemento curricular" : "Adicionar classe ou especialidade"}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Tipo<select disabled={Boolean(editingCatalogId)} value={catalogForm.kind} onChange={(event) => setCatalogForm({ ...catalogForm, kind: event.target.value as "CLASS" | "SPECIALTY" })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:bg-slate-100"><option value="CLASS">Classe</option><option value="SPECIALTY">Especialidade</option></select></label>
                  <label className="text-sm font-medium text-slate-700">Código<input required minLength={2} maxLength={60} value={catalogForm.code} onChange={(event) => setCatalogForm({ ...catalogForm, code: event.target.value })} placeholder="Ex.: CLASSE-01" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Nome<input required minLength={2} maxLength={160} value={catalogForm.name} onChange={(event) => setCatalogForm({ ...catalogForm, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Nível ou faixa<input maxLength={120} value={catalogForm.level} onChange={(event) => setCatalogForm({ ...catalogForm, level: event.target.value })} placeholder="Opcional" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                  <label className="text-sm font-medium text-slate-700">Referência oficial (HTTPS)<input type="url" value={catalogForm.official_reference_url} onChange={(event) => setCatalogForm({ ...catalogForm, official_reference_url: event.target.value })} placeholder="https://…" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Descrição<textarea rows={2} maxLength={2000} value={catalogForm.description} onChange={(event) => setCatalogForm({ ...catalogForm, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A guardar…" : editingCatalogId ? "Guardar alterações" : "Guardar elemento curricular"}</button>{editingCatalogId && <button type="button" disabled={saving} onClick={() => { setEditingCatalogId(null); setCatalogForm(emptyCatalog); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar edição</button>}</div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-[#0C1A3D]">Progresso individual</h3>
              <form onSubmit={assignProgress} className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">Membro ativo<select required value={memberId} onChange={(event) => setMemberId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">Selecione um membro</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{displayName(profiles[member.userId])}</option>)}</select></label>
                <label className="block text-sm font-medium text-slate-700">Classe ou especialidade<select required value={catalogItemId} onChange={(event) => setCatalogItemId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">Selecione um item</option>{activeCatalog.map((item) => <option key={item.id} value={item.id}>{item.kind === "CLASS" ? "Classe" : "Especialidade"} · {item.name}</option>)}</select></label>
                <button type="submit" disabled={saving || !activeMembers.length || !activeCatalog.length} className="rounded-xl border border-[#C8A24A] px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] disabled:opacity-50">Atribuir progresso</button>
              </form>
              <div className="mt-5 space-y-2">
                {progress.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Os registos de progresso aparecerão aqui após a atribuição.</p> : progress.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{displayName(profiles[item.user_id])}</p><p className="text-sm text-slate-600">{item.catalog?.name ?? "Elemento curricular"}</p></div><span className="text-xs font-semibold text-slate-500">{item.status}</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status !== "COMPLETED" && item.status !== "VERIFIED" && <button type="button" disabled={saving} onClick={() => void changeProgress(item.id, "COMPLETED")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Marcar concluído</button>}
                      {item.status === "COMPLETED" && <button type="button" disabled={saving} onClick={() => void changeProgress(item.id, "VERIFIED")} className="rounded-lg bg-[#0C1A3D] px-3 py-1.5 text-xs font-semibold text-white">Verificar</button>}
                      {item.status === "VERIFIED" && <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Verificado</span>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">A verificação final é validada pelas permissões da organização no Supabase. Os dirigentes podem registar conclusão; a verificação exige permissão de gestão.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h3 className="text-lg font-semibold text-[#0C1A3D]">Investiduras</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Registe pedidos de investidura, acompanhe aprovação e mantenha o histórico associado ao clube e à classe.</p>
                <form onSubmit={requestInvestiture} className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Membro<select required value={investitureForm.user_id} onChange={(event) => setInvestitureForm({ ...investitureForm, user_id: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">Selecione um membro ativo</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{displayName(profiles[member.userId])}</option>)}</select></label>
                  <label className="block text-sm font-medium text-slate-700">Classe a investir<select required value={investitureForm.class_catalog_id} onChange={(event) => setInvestitureForm({ ...investitureForm, class_catalog_id: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">Selecione uma classe ativa</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.level ? ` · ${item.level}` : ""}</option>)}</select></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">Data prevista<input type="date" value={investitureForm.scheduled_date} onChange={(event) => setInvestitureForm({ ...investitureForm, scheduled_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                    <label className="text-sm font-medium text-slate-700">Local<input maxLength={240} value={investitureForm.location} onChange={(event) => setInvestitureForm({ ...investitureForm, location: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">Notas<textarea rows={2} maxLength={2000} value={investitureForm.notes} onChange={(event) => setInvestitureForm({ ...investitureForm, notes: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                  <button type="submit" disabled={saving || !classes.length || !activeMembers.length} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Registar pedido</button>
                </form>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-[#0C1A3D]">Histórico e decisões</h4>
                {investitures.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Ainda não há investiduras registadas.</p> : investitures.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{displayName(profiles[item.user_id])}</p><p className="text-sm text-slate-600">{item.class?.name ?? "Classe"}{item.scheduled_date ? ` · ${item.scheduled_date}` : ""}</p><p className="mt-1 text-xs text-slate-500">{item.location || "Local por definir"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item.status}</span></div>
                    {item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}
                    {item.status === "REQUESTED" && <button type="button" disabled={saving} onClick={() => void changeInvestiture(item, "APPROVED")} className="mt-3 rounded-lg border border-[#C8A24A] px-3 py-1.5 text-xs font-semibold">Aprovar pedido</button>}
                    {item.status === "APPROVED" && <button type="button" disabled={saving} onClick={() => void changeInvestiture(item, "COMPLETED")} className="mt-3 rounded-lg bg-[#0C1A3D] px-3 py-1.5 text-xs font-semibold text-white">Registar cerimónia concluída</button>}
                  </article>
                ))}
                <p className="text-xs leading-5 text-slate-500">A criação de pedidos é permitida a dirigentes autorizados. Aprovação e conclusão são controladas por permissões de gestão da organização.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
