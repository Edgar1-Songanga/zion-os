"use client";

import { useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import { YOUTH_PROGRAMS } from "@/components/youth/core/YouthProgram";
import { getMinistryCatalogEntry } from "@/components/ministry/ministry-catalog";

type YouthClubRecord = {
  id: string;
  organizationId: string;
  ministryId?: string | null;
  name: string;
  programId: string;
  motto: string;
  description: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

type ClubForm = {
  name: string;
  programId: string;
  motto: string;
  description: string;
  coverImageUrl: string;
};

type OrganizationMember = { id: string; user_id: string; status: string; joined_at?: string; roles?: { key?: string; name?: string } | null };
type PersonProfile = { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; avatar_url?: string | null; email?: string | null };
type ClubMember = { clubId: string; userId: string; status: "ACTIVE" | "INACTIVE"; joinedAt: string };
type ClubLeader = { clubId: string; userId: string; role: string; verified: boolean; createdAt: string };

function personName(person?: PersonProfile) {
  if (!person) return "Perfil sem nome disponível";
  return person.display_name || [person.first_name, person.last_name].filter(Boolean).join(" ") || "Membro ZION";
}

const CATALOG_ID_BY_PROGRAM: Record<string, string> = {
  adventurers: "adventurer-club",
  pathfinders: "pathfinder-club",
  ambassadors: "ambassadors",
  "young-adults": "young-adults",
  "public-campus-ministries": "public-campus-ministries",
};

const EMPTY_FORM: ClubForm = {
  name: "",
  programId: "pathfinders",
  motto: "",
  description: "",
  coverImageUrl: "",
};

export default function YouthClubOperations() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [clubs, setClubs] = useState<YouthClubRecord[]>([]);
  const [form, setForm] = useState<ClubForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [clubLeaders, setClubLeaders] = useState<ClubLeader[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PersonProfile>>({});
  const [personQuery, setPersonQuery] = useState("");
  const [personResults, setPersonResults] = useState<PersonProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [leaderRole, setLeaderRole] = useState("Dirigente do clube");
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleSaving, setPeopleSaving] = useState(false);

  async function loadClubs(id: string) {
    setOrganizationId(id);
    setClubs([]);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await resaRequest<YouthClubRecord[]>(`/v1/youth/clubs/organization/${encodeURIComponent(id)}`);
      setClubs(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os clubes desta organização.");
    } finally {
      setLoading(false);
    }
  }

  function selectOrganization(id: string, selectedOrganization: ZionOrganization) {
    setOrganization(selectedOrganization);
    void loadClubs(id);
  }

  function startEdit(club: YouthClubRecord) {
    setEditingId(club.id);
    setForm({
      name: club.name,
      programId: club.programId,
      motto: club.motto,
      description: club.description,
      coverImageUrl: club.coverImageUrl ?? "",
    });
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
  }

  async function loadPeople(club: YouthClubRecord) {
    setSelectedClubId(club.id);
    setPeopleLoading(true);
    setError(null);
    setPersonQuery("");
    setPersonResults([]);
    setSelectedUserId("");
    try {
      const [members, leaders, organizationMembers] = await Promise.all([
        resaRequest<ClubMember[]>(`/v1/youth/clubs/${encodeURIComponent(club.id)}/members`),
        resaRequest<ClubLeader[]>(`/v1/youth/clubs/${encodeURIComponent(club.id)}/leaders`),
        resaRequest<OrganizationMember[]>(`/v1/organizations/${encodeURIComponent(club.organizationId)}/memberships`),
      ]);
      setClubMembers(members);
      setClubLeaders(leaders);
      setOrgMembers(organizationMembers.filter((member) => member.status === "ACTIVE"));
      const ids = Array.from(new Set([...members.map((item) => item.userId), ...leaders.map((item) => item.userId)]));
      if (ids.length) {
        const suggestions = await resaRequest<PersonProfile[]>(`/v1/resa/profiles/suggestions?limit=30`).catch(() => []);
        setProfiles((current) => ({ ...current, ...Object.fromEntries(suggestions.map((person) => [person.id, person])) }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar membros e dirigentes.");
    } finally {
      setPeopleLoading(false);
    }
  }

  async function searchPeople(query: string) {
    setPersonQuery(query);
    setSelectedUserId("");
    if (query.trim().length < 2) {
      setPersonResults([]);
      return;
    }
    try {
      const found = await resaRequest<PersonProfile[]>(`/v1/resa/search?q=${encodeURIComponent(query.trim())}&type=profile&limit=30`);
      const activeIds = new Set(orgMembers.map((member) => member.user_id));
      const filtered = found.filter((person) => activeIds.has(person.id));
      setPersonResults(filtered);
      setProfiles((current) => ({ ...current, ...Object.fromEntries(filtered.map((person) => [person.id, person])) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível pesquisar membros da organização.");
      setPersonResults([]);
    }
  }

  async function addSelectedMember() {
    if (!selectedClubId || !selectedUserId || peopleSaving) return;
    setPeopleSaving(true);
    setError(null);
    try {
      await resaRequest(`/v1/youth/clubs/${encodeURIComponent(selectedClubId)}/members`, {
        method: "POST", body: JSON.stringify({ user_id: selectedUserId }),
      });
      const club = clubs.find((item) => item.id === selectedClubId);
      if (club) await loadPeople(club);
      setMessage("Membro associado ao clube.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível adicionar o membro.");
    } finally {
      setPeopleSaving(false);
    }
  }

  async function updateClubMember(userId: string, status: "ACTIVE" | "INACTIVE") {
    if (!selectedClubId || peopleSaving) return;
    setPeopleSaving(true);
    setError(null);
    try {
      await resaRequest(`/v1/youth/clubs/${encodeURIComponent(selectedClubId)}/members/${encodeURIComponent(userId)}`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      const club = clubs.find((item) => item.id === selectedClubId);
      if (club) await loadPeople(club);
      setMessage(status === "ACTIVE" ? "Participação reativada." : "Participação suspensa.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a participação.");
    } finally {
      setPeopleSaving(false);
    }
  }

  async function assignSelectedLeader() {
    if (!selectedClubId || !selectedUserId || !leaderRole.trim() || peopleSaving) return;
    setPeopleSaving(true);
    setError(null);
    try {
      await resaRequest(`/v1/youth/clubs/${encodeURIComponent(selectedClubId)}/leaders`, {
        method: "POST", body: JSON.stringify({ user_id: selectedUserId, role: leaderRole.trim() }),
      });
      const club = clubs.find((item) => item.id === selectedClubId);
      if (club) await loadPeople(club);
      setMessage("Dirigente atribuído com sucesso.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atribuir o dirigente.");
    } finally {
      setPeopleSaving(false);
    }
  }

  async function removeLeader(userId: string) {
    if (!selectedClubId || peopleSaving) return;
    setPeopleSaving(true);
    setError(null);
    try {
      await resaRequest(`/v1/youth/clubs/${encodeURIComponent(selectedClubId)}/leaders/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const club = clubs.find((item) => item.id === selectedClubId);
      if (club) await loadPeople(club);
      setMessage("Atribuição de dirigente removida.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover a atribuição.");
    } finally {
      setPeopleSaving(false);
    }
  }

  async function saveClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      program_id: form.programId,
      motto: form.motto.trim(),
      description: form.description.trim(),
      cover_image_url: form.coverImageUrl.trim() || null,
    };
    try {
      const saved = await resaRequest<YouthClubRecord>(
        editingId ? `/v1/youth/clubs/${encodeURIComponent(editingId)}` : "/v1/youth/clubs",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(editingId ? payload : { ...payload, organization_id: organizationId }),
        },
      );
      setClubs((current) => {
        const next = editingId
          ? current.map((club) => club.id === saved.id ? saved : club)
          : [...current, saved];
        return next.sort((a, b) => a.programId.localeCompare(b.programId) || a.name.localeCompare(b.name));
      });
      setEditingId(null);
      setForm(EMPTY_FORM);
      setMessage(editingId ? "Perfil do clube atualizado." : "Clube registado com sucesso.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o clube.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Gestão operacional</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">Clubes e unidades locais</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Registe clubes reais, associe-os ao programa adequado e mantenha a sua identidade visual. Os dados são carregados da API, com autorização da organização; não são usados números demonstrativos.</p>
        </div>
        <div>
          <OrganizationSelector value={organizationId} onChange={selectOrganization} />
          {organization && <p className="mt-2 text-xs text-slate-500">Organização selecionada: <strong className="text-slate-700">{organization.name}</strong></p>}
        </div>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {organization && (
        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#0C1A3D]">Clubes registados</h3>
              <span className="text-xs text-slate-500">{clubs.length} registo{clubs.length === 1 ? "" : "s"}</span>
            </div>
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">A carregar clubes…</div>
            ) : clubs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7">
                <h4 className="font-semibold text-[#0C1A3D]">Ainda não há clubes registados</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">Crie o primeiro clube no formulário. Os membros, dirigentes e progressão serão ligados às tabelas operacionais na próxima etapa.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {clubs.map((club) => {
                  const catalog = getMinistryCatalogEntry(CATALOG_ID_BY_PROGRAM[club.programId]);
                  const cover = club.coverImageUrl ?? catalog?.coverImage;
                  const programName = YOUTH_PROGRAMS.find((program) => program.id === club.programId)?.name ?? club.programId;
                  return (
                    <article key={club.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="relative h-36 bg-[#0C1A3D]">
                        {cover && <img src={cover} alt={`Fotografia ilustrativa — ${club.name}`} className="h-full w-full object-cover" loading="lazy" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071126]/85 to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">{programName}</span>
                        <h4 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-white">{club.name}</h4>
                      </div>
                      <div className="p-4">
                        <p className="text-sm leading-6 text-slate-600">{club.description || "Sem descrição adicional."}</p>
                        {club.motto && <p className="mt-3 border-l-2 border-[#C8A24A] pl-3 text-xs italic text-slate-500">{club.motto}</p>}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className={club.status === "ACTIVE" ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-slate-500"}>{club.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
                          <div className="flex gap-2"><button type="button" onClick={() => void loadPeople(club)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] transition hover:border-[#C8A24A]">Membros</button><button type="button" onClick={() => startEdit(club)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] transition hover:border-[#C8A24A]">Editar perfil</button></div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F8F9FB] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9B7A34]">{editingId ? "Editar registo" : "Novo registo"}</p>
            <h3 className="mt-2 text-lg font-semibold text-[#0C1A3D]">{editingId ? "Atualizar clube" : "Registar um clube"}</h3>
            <form onSubmit={saveClub} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Nome do clube
                <input required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A]" placeholder="Ex.: Clube Monte Sinai" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Programa
                <select required value={form.programId} onChange={(event) => setForm({ ...form, programId: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A]">
                  {YOUTH_PROGRAMS.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Lema
                <input maxLength={160} value={form.motto} onChange={(event) => setForm({ ...form, motto: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A]" placeholder="Lema do clube" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Descrição
                <textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A]" placeholder="Missão e identidade local" />
              </label>
              <label className="block text-sm font-medium text-slate-700">URL HTTPS da fotografia de capa
                <input type="url" value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A]" placeholder="https://…" />
              </label>
              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" disabled={saving || !form.name.trim()} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182c58] disabled:opacity-50">{saving ? "A guardar…" : editingId ? "Guardar alterações" : "Registar clube"}</button>
                {editingId && <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>}
              </div>
            </form>
          </div>
        </div>
      )}

          {selectedClubId && (
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9B7A34]">Pessoas e responsabilidades</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{clubs.find((club) => club.id === selectedClubId)?.name ?? "Clube selecionado"}</h3>
                  <p className="mt-1 text-sm text-slate-500">Só pode associar pessoas que já sejam membros ativos da organização selecionada.</p>
                </div>
                <button type="button" onClick={() => setSelectedClubId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Fechar gestão</button>
              </div>
              {peopleLoading ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">A carregar pessoas e permissões…</p> : (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-[#0C1A3D]">Membros do clube <span className="text-sm font-normal text-slate-500">({clubMembers.length})</span></h4>
                    <div className="mt-3 space-y-2">
                      {clubMembers.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Ainda não existem membros associados a este clube.</p> : clubMembers.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{personName(profiles[member.userId])}</p><p className="text-xs text-slate-500">{member.status === "ACTIVE" ? "Participação ativa" : "Participação inativa"}</p></div>
                          <button type="button" disabled={peopleSaving} onClick={() => void updateClubMember(member.userId, member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] disabled:opacity-50">{member.status === "ACTIVE" ? "Suspender" : "Reativar"}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0C1A3D]">Adicionar pessoa da organização</h4>
                    <label className="mt-3 block text-sm font-medium text-slate-700">Pesquisar por nome
                      <input value={personQuery} onChange={(event) => void searchPeople(event.target.value)} placeholder="Escreva pelo menos 2 caracteres" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C8A24A]" />
                    </label>
                    <label className="mt-3 block text-sm font-medium text-slate-700">Resultado da pesquisa
                      <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <option value="">Selecione uma pessoa</option>
                        {personResults.filter((person) => !clubMembers.some((member) => member.userId === person.id && member.status === "ACTIVE")).map((person) => <option key={person.id} value={person.id}>{personName(person)}{person.email ? ` · ${person.email}` : ""}</option>)}
                      </select>
                    </label>
                    <button type="button" disabled={!selectedUserId || peopleSaving} onClick={() => void addSelectedMember()} className="mt-3 rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{peopleSaving ? "A guardar…" : "Associar ao clube"}</button>
                    <div className="mt-7 border-t border-slate-100 pt-5">
                      <h4 className="font-semibold text-[#0C1A3D]">Dirigentes atribuídos <span className="text-sm font-normal text-slate-500">({clubLeaders.length})</span></h4>
                      <div className="mt-3 space-y-2">
                        {clubLeaders.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Ainda não existem dirigentes atribuídos.</p> : clubLeaders.map((leader) => (
                          <div key={leader.userId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{personName(profiles[leader.userId])}</p><p className="text-xs text-slate-500">{leader.role}{leader.verified ? " · Verificado" : " · Aguardando verificação"}</p></div>
                            <button type="button" disabled={peopleSaving} onClick={() => void removeLeader(leader.userId)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Remover</button>
                          </div>
                        ))}
                      </div>
                      <label className="mt-4 block text-sm font-medium text-slate-700">Função do dirigente
                        <select value={leaderRole} onChange={(event) => setLeaderRole(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <option>Dirigente do clube</option><option>Diretor</option><option>Diretor associado</option><option>Secretário</option><option>Capelão</option><option>Instrutor</option><option>Coordenador de unidade</option>
                        </select>
                      </label>
                      <p className="mt-2 text-xs leading-5 text-slate-500">Pesquise e selecione um membro ativo acima; depois atribua a função. A atribuição de dirigente exige permissão de gestão da organização.</p>
                      <button type="button" disabled={!selectedUserId || peopleSaving || !clubMembers.some((member) => member.userId === selectedUserId && member.status === "ACTIVE")} onClick={() => void assignSelectedLeader()} className="mt-3 rounded-xl border border-[#C8A24A] px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] disabled:opacity-50">Atribuir dirigente selecionado</button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
    </section>
  );
}
