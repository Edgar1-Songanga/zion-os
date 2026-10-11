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
                          <button type="button" onClick={() => startEdit(club)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] transition hover:border-[#C8A24A]">Editar perfil</button>
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
    </section>
  );
}
