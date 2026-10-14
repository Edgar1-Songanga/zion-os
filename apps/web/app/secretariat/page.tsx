"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import { resaRequest } from "@/lib/resa/api";

type Member = {
  id: string;
  organization_id: string;
  member_number: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  baptism_date: string | null;
  membership_status: "ACTIVE" | "TRANSFERRED" | "DECEASED" | "DISMISSED" | "INACTIVE";
  joined_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type FamilyRelationship = {
  id: string;
  organization_id: string;
  member_record_id: string;
  related_member_record_id: string;
  relationship_type: "PARENT_OF" | "CHILD_OF" | "SPOUSE" | "SIBLING" | "GUARDIAN_OF" | "WARD_OF" | "OTHER";
  notes: string | null;
  is_active: boolean;
  created_at: string;
};
type StatusEvent = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
};

const RELATIONSHIP_LABELS: Record<FamilyRelationship["relationship_type"], string> = {
  PARENT_OF: "É progenitor de",
  CHILD_OF: "É filho/a de",
  SPOUSE: "Cônjuge de",
  SIBLING: "Irmão/irmã de",
  GUARDIAN_OF: "Tutor/a de",
  WARD_OF: "Pessoa sob tutela de",
  OTHER: "Outra relação com",
};

const STATUS_LABELS: Record<Member["membership_status"], string> = {
  ACTIVE: "Activo",
  TRANSFERRED: "Transferido",
  DECEASED: "Falecido",
  DISMISSED: "Removido",
  INACTIVE: "Inactivo",
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date);
}

export default function SecretariatPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [historyMemberId, setHistoryMemberId] = useState("");
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [familyRelationships, setFamilyRelationships] = useState<FamilyRelationship[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [familyNotice, setFamilyNotice] = useState("");

  const loadMembers = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await resaRequest<Member[]>(`/v1/organizations/${encodeURIComponent(id)}/church-members`);
      setMembers(data);
      setFamilyLoading(true);
      setFamilyError("");
      try {
        const relationships = await resaRequest<FamilyRelationship[]>(`/v1/organizations/${encodeURIComponent(id)}/church-member-families`);
        setFamilyRelationships(relationships);
      } catch (familyReason) {
        setFamilyRelationships([]);
        setFamilyError(familyReason instanceof Error ? familyReason.message : "Não foi possível carregar as relações familiares.");
      } finally {
        setFamilyLoading(false);
      }
    } catch (reason) {
      setMembers([]);
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o registo de membros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) void loadMembers(organizationId);
  }, [organizationId, loadMembers]);

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt");
    if (!normalized) return members;
    return members.filter((member) =>
      [member.member_number, member.first_name, member.last_name, member.phone, member.email]
        .some((value) => value?.toLocaleLowerCase("pt").includes(normalized)),
    );
  }, [members, query]);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      first_name: String(form.get("first_name") ?? "").trim(),
      last_name: String(form.get("last_name") ?? "").trim(),
      member_number: String(form.get("member_number") ?? "").trim() || null,
      birth_date: String(form.get("birth_date") ?? "") || null,
      baptism_date: String(form.get("baptism_date") ?? "") || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      gender: String(form.get("gender") ?? "") || null,
      joined_on: String(form.get("joined_on") ?? "") || null,
      membership_status: String(form.get("membership_status") ?? "ACTIVE"),
    };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const path = `/v1/organizations/${encodeURIComponent(organizationId)}/church-members${editingMember ? `/${encodeURIComponent(editingMember.id)}` : ""}`;
      await resaRequest<Member>(path, {
        method: editingMember ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editingMember ? "Registo de membro actualizado." : "Registo de membro criado e guardado na base de dados.");
      setFormOpen(false);
      setEditingMember(null);
      formElement.reset();
      await loadMembers(organizationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o membro.");
    } finally {
      setSaving(false);
    }
  }

  async function createFamilyRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      member_record_id: String(form.get("member_record_id") ?? ""),
      related_member_record_id: String(form.get("related_member_record_id") ?? ""),
      relationship_type: String(form.get("relationship_type") ?? ""),
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    setFamilySaving(true);
    setFamilyError("");
    setFamilyNotice("");
    try {
      await resaRequest<FamilyRelationship>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-families`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const relationships = await resaRequest<FamilyRelationship[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-families`);
      setFamilyRelationships(relationships);
      formElement.reset();
      setFamilyNotice("Relação familiar registada.");
    } catch (reason) {
      setFamilyError(reason instanceof Error ? reason.message : "Não foi possível guardar a relação familiar.");
    } finally {
      setFamilySaving(false);
    }
  }

  async function toggleHistory(memberId: string) {
    if (historyMemberId === memberId) {
      setHistoryMemberId("");
      setHistory([]);
      return;
    }
    setHistoryMemberId(memberId);
    setHistory([]);
    setHistoryLoading(true);
    setError("");
    try {
      const data = await resaRequest<StatusEvent[]>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/church-members/${encodeURIComponent(memberId)}/status-history`,
      );
      setHistory(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o histórico.");
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#101B35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_28px_90px_rgba(7,17,38,0.16)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute right-16 top-16 h-40 w-40 rounded-full border border-[#D6B66B]/20" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">ZION OS · Administração eclesiástica</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Secretaria</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Registo oficial de membros, dados de baptismo e histórico de estado, protegido pelo âmbito e pelas permissões da organização seleccionada.
              </p>
            </div>
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.07] p-4 lg:min-w-[220px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Registo actual</p>
              <p className="mt-2 text-2xl font-semibold">{loading ? "…" : members.length.toLocaleString("pt-PT")}</p>
              <p className="mt-1 text-xs text-slate-400">membros devolvidos pela API</p>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xl">
            <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
            {organization && <p className="mt-2 text-xs text-slate-500">Âmbito activo: <strong className="text-slate-700">{organization.name}</strong> · {organization.organization_type}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void loadMembers(organizationId)} disabled={!organizationId || loading}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
              {loading ? "A actualizar…" : "Actualizar"}
            </button>
            <button type="button" onClick={() => { if (formOpen) { setFormOpen(false); setEditingMember(null); } else { setEditingMember(null); setFormOpen(true); } }} disabled={!organizationId}
              className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-40">
              {formOpen ? "Fechar formulário" : "Adicionar membro"}
            </button>
          </div>
        </section>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

        {formOpen && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">{editingMember ? "Editar registo" : "Novo registo"}</p>
              <h2 className="mt-2 text-xl font-semibold">Dados do membro</h2>
              <p className="mt-1 text-sm text-slate-500">Os dados são enviados para a API autenticada; a base de dados aplica as permissões RLS.</p>
            </div>
            <form key={editingMember?.id ?? "new-member"} onSubmit={createMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Nome próprio *<input required name="first_name" defaultValue={editingMember?.first_name ?? ""} maxLength={120} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Apelido *<input required name="last_name" defaultValue={editingMember?.last_name ?? ""} maxLength={160} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">N.º de membro<input name="member_number" defaultValue={editingMember?.member_number ?? ""} maxLength={80} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de nascimento<input type="date" name="birth_date" defaultValue={editingMember?.birth_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de baptismo<input type="date" name="baptism_date" defaultValue={editingMember?.baptism_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de entrada<input type="date" name="joined_on" defaultValue={editingMember?.joined_on ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Sexo<select name="gender" defaultValue={editingMember?.gender ?? ""} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#C8A24A]"><option value="">Não especificado</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="UNSPECIFIED">Não declarado</option></select></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Telefone<input name="phone" defaultValue={editingMember?.phone ?? ""} maxLength={40} autoComplete="tel" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Email<input name="email" type="email" defaultValue={editingMember?.email ?? ""} maxLength={254} autoComplete="email" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Estado<select name="membership_status" defaultValue={editingMember?.membership_status ?? "ACTIVE"} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#C8A24A]">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-50 sm:w-auto">
                  {saving ? "A guardar…" : editingMember ? "Guardar alterações" : "Guardar registo"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Registo eclesiástico</p>
              <h2 className="mt-2 text-xl font-semibold">Membros da organização</h2>
              <p className="mt-1 text-sm text-slate-500">A listagem mostra apenas registos que a sessão autenticada tem autorização para consultar.</p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-slate-500">Pesquisar membros<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, número, telefone ou email" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal text-slate-800 outline-none focus:border-[#C8A24A] sm:min-w-[300px]" /></label>
          </div>
          {!organizationId ? <p className="p-7 text-sm text-slate-500">Seleccione uma organização para consultar o registo oficial.</p>
          : loading ? <p className="p-7 text-sm text-slate-500">A carregar registos reais…</p>
          : filteredMembers.length === 0 ? <p className="p-7 text-sm text-slate-500">{members.length ? "Não existem resultados para esta pesquisa." : "Não existem membros visíveis nesta organização ou a sessão não tem permissão para os consultar."}</p>
          : <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4 font-semibold">Membro</th><th className="px-5 py-4 font-semibold">Número</th><th className="px-5 py-4 font-semibold">Baptismo</th><th className="px-5 py-4 font-semibold">Contacto</th><th className="px-5 py-4 font-semibold">Estado</th><th className="px-5 py-4 font-semibold">Histórico</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => <tr key={member.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-semibold text-[#101B35]">{member.first_name} {member.last_name}</p><p className="mt-1 text-xs text-slate-500">Nascimento: {dateLabel(member.birth_date)}</p></td>
                    <td className="px-5 py-4 text-slate-600">{member.member_number || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{dateLabel(member.baptism_date)}</td>
                    <td className="px-5 py-4 text-slate-600"><p>{member.phone || "—"}</p><p className="mt-1 text-xs text-slate-400">{member.email || ""}</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.membership_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[member.membership_status] ?? member.membership_status}</span></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => { setEditingMember(member); setFormOpen(true); setError(""); setNotice(""); }} className="text-xs font-semibold text-[#0C1A3D] underline-offset-4 hover:underline">Editar</button><button type="button" onClick={() => void toggleHistory(member.id)} className="text-xs font-semibold text-[#7B6127] underline-offset-4 hover:underline">{historyMemberId === member.id ? "Fechar" : "Histórico"}</button></div></td>
                  </tr>).flatMap((row, index) => {
                    const member = filteredMembers[index];
                    if (historyMemberId !== member.id) return [row];
                    return [row, <tr key={`${member.id}-history`}><td colSpan={6} className="bg-[#FBF9F3] px-5 py-4">{historyLoading ? <p className="text-sm text-slate-500">A carregar histórico…</p> : history.length === 0 ? <p className="text-sm text-slate-500">Sem eventos de estado disponíveis.</p> : <ol className="space-y-3">{history.map((event) => <li key={event.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{event.previous_status ? `${STATUS_LABELS[event.previous_status as keyof typeof STATUS_LABELS] ?? event.previous_status} → ` : "Registo inicial → "}{STATUS_LABELS[event.new_status as keyof typeof STATUS_LABELS] ?? event.new_status}</span><span className="text-xs text-slate-500">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.changed_at))} · {event.note || "Sem observação"}</span></li>)}</ol>}</td></tr>];
                  })}
                </tbody>
              </table>
            </div>}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Estrutura familiar</p>
            <h2 className="mt-2 text-xl font-semibold">Relações entre membros</h2>
            <p className="mt-1 text-sm text-slate-500">As duas pessoas têm de pertencer à mesma organização; a base de dados impede relações entre organizações diferentes.</p>
          </div>
          {familyError && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-7">{familyError}</p>}
          {familyNotice && <p role="status" className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-7">{familyNotice}</p>}
          <form onSubmit={createFamilyRelationship} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-4">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro<select required name="member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Relação<select required name="relationship_type" defaultValue="PARENT_OF" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro relacionado<select required name="related_member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Observação (opcional)<input name="notes" maxLength={2000} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Nota administrativa" /></label>
            <div className="sm:col-span-2 lg:col-span-4"><button type="submit" disabled={familySaving || familyLoading || members.length < 2} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{familySaving ? "A guardar…" : "Registar relação familiar"}</button></div>
          </form>
          {familyLoading ? <p className="p-6 text-sm text-slate-500">A carregar relações familiares…</p> : familyRelationships.length === 0 ? <p className="p-6 text-sm text-slate-500">Ainda não existem relações familiares visíveis nesta organização.</p> : <div className="divide-y divide-slate-100">{familyRelationships.map((relationship) => {
            const member = members.find((item) => item.id === relationship.member_record_id);
            const related = members.find((item) => item.id === relationship.related_member_record_id);
            return <div key={relationship.id} className="flex flex-col gap-1 px-5 py-4 sm:px-7"><p className="text-sm font-semibold">{member ? `${member.first_name} ${member.last_name}` : "Membro"} <span className="font-normal text-slate-500">{RELATIONSHIP_LABELS[relationship.relationship_type] ?? relationship.relationship_type}</span> {related ? `${related.first_name} ${related.last_name}` : "membro relacionado"}</p>{relationship.notes && <p className="text-xs text-slate-500">{relationship.notes}</p>}</div>;
          })}</div>}
        </section>
        <p className="px-1 text-xs leading-5 text-slate-400">Nesta primeira entrega estão incluídos o registo básico de membros, dados de baptismo, pesquisa e histórico automático de estado. Famílias, transferências formais, cartas, declarações, arquivo documental e relatórios administrativos exigem os seus próprios modelos de dados e fluxos auditáveis; não são simulados nesta página.</p>
      </div>
    </main>
  );
}
