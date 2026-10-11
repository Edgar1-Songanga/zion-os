"use client";

import { useEffect, useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type Club = { id: string; organizationId: string; name: string; programId: string; status: "ACTIVE" | "INACTIVE" };
type ClubMember = { userId: string; status: "ACTIVE" | "INACTIVE" };
type Profile = { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null };
type Activity = {
  id: string; club_id: string; title: string; description: string; activity_type: string;
  starts_at: string; ends_at?: string | null; location: string; leader_user_id?: string | null;
  status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
};
type Participant = { activity_id: string; club_id: string; user_id: string; status: "REGISTERED" | "ATTENDED" | "ABSENT" | "CANCELLED"; notes?: string };
type Report = {
  clubs_total: number; clubs_active: number; active_members_unique: number; activities_total: number;
  activities_upcoming: number; activities_completed: number; progress_in_progress: number;
  progress_completed: number; investitures_requested: number; investitures_completed: number;
  attendance_confirmed: number;
  by_program?: Array<{ program_id: string; clubs: number; active_memberships: number; activities: number }>;
};

const emptyForm = { title: "", description: "", activity_type: "meeting", starts_at: "", ends_at: "", location: "", leader_user_id: "" };
const ACTIVITY_TYPES = [
  ["meeting", "Reunião"], ["camp", "Acampamento"], ["congress", "Congresso"],
  ["investiture", "Investidura"], ["training", "Formação"], ["mission", "Missão"],
  ["community_service", "Serviço comunitário"],
] as const;

function personName(profile?: Profile) {
  return profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Membro";
}
function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function YouthActivityOperations() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [clubLeaderIds, setClubLeaderIds] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantUserId, setParticipantUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;
  const activeMembers = members.filter((member) => member.status === "ACTIVE");

  async function selectOrganization(id: string, selected: ZionOrganization) {
    setOrganization(selected); setOrganizationId(id); setClubId(""); setClubs([]);
    setActivities([]); setReport(null); setSelectedActivityId(""); setParticipants([]);
    setError(null); setMessage(null); setLoading(true);
    try {
      const rows = await resaRequest<Club[]>(`/v1/youth/clubs/organization/${encodeURIComponent(id)}`);
      const active = rows.filter((club) => club.status === "ACTIVE");
      setClubs(active); setClubId(active[0]?.id ?? "");
      const currentReport = await resaRequest<Report>(`/v1/youth/activities/organization/${encodeURIComponent(id)}/report`).catch(() => null);
      setReport(currentReport);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados operacionais.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!selectedClub) return;
    let current = true;
    setLoading(true); setError(null); setSelectedActivityId(""); setParticipants([]);
    Promise.all([
      resaRequest<Activity[]>(`/v1/youth/activities/clubs/${encodeURIComponent(selectedClub.id)}`),
      resaRequest<ClubMember[]>(`/v1/youth/clubs/${encodeURIComponent(selectedClub.id)}/members`),
      resaRequest<{ members: Array<{ user_id: string; profile: Profile | null }>; leaders: Array<{ user_id: string; profile: Profile | null }> }>(`/v1/youth/progression/clubs/${encodeURIComponent(selectedClub.id)}/people`),
      resaRequest<Report>(`/v1/youth/activities/organization/${encodeURIComponent(selectedClub.organizationId)}/report`).catch(() => null),
    ]).then(([activityRows, memberRows, people, currentReport]) => {
      if (!current) return;
      setActivities(activityRows); setMembers(memberRows); setReport(currentReport);
      const resolved = [...people.members, ...people.leaders].map((person) => person.profile).filter((profile): profile is Profile => profile !== null);
      setProfiles((previous) => ({ ...previous, ...Object.fromEntries(resolved.map((profile) => [profile.id, profile])) }));
      setClubLeaderIds(people.leaders.map((leader) => leader.user_id));
    }).catch((reason) => {
      if (current) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as atividades do clube.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [clubId, selectedClub?.organizationId]);

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClub || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        leader_user_id: form.leader_user_id || null,
      };
      const saved = await resaRequest<Activity>(
        editingActivityId
          ? `/v1/youth/activities/${encodeURIComponent(editingActivityId)}`
          : `/v1/youth/activities/clubs/${encodeURIComponent(selectedClub.id)}`,
        { method: editingActivityId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setActivities((items) => {
        const next = editingActivityId
          ? items.map((item) => item.id === saved.id ? { ...item, ...saved } : item)
          : [saved, ...items];
        return next.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
      });
      setForm(emptyForm);
      setEditingActivityId(null);
      setMessage(editingActivityId ? "Atividade atualizada." : "Atividade registada.");
      const updatedReport = await resaRequest<Report>(`/v1/youth/activities/organization/${encodeURIComponent(organizationId)}/report`).catch(() => null);
      setReport(updatedReport);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar a atividade.");
    } finally { setSaving(false); }
  }

  function editActivity(activity: Activity) {
    setEditingActivityId(activity.id);
    setForm({
      title: activity.title,
      description: activity.description ?? "",
      activity_type: activity.activity_type,
      starts_at: toDateTimeLocal(activity.starts_at),
      ends_at: activity.ends_at ? toDateTimeLocal(activity.ends_at) : "",
      location: activity.location ?? "",
      leader_user_id: activity.leader_user_id ?? "",
    });
    setError(null); setMessage(null);
  }

  function cancelActivityEdit() {
    setEditingActivityId(null);
    setForm(emptyForm);
    setError(null); setMessage(null);
  }

  async function changeActivityStatus(activity: Activity, status: Activity["status"]) {
    if (saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await resaRequest<Activity>(`/v1/youth/activities/${encodeURIComponent(activity.id)}`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setActivities((items) => items.map((item) => item.id === activity.id ? { ...item, ...updated } : item));
      const updatedReport = await resaRequest<Report>(`/v1/youth/activities/organization/${encodeURIComponent(organizationId)}/report`).catch(() => null);
      setReport(updatedReport); setMessage("Estado da atividade atualizado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a atividade.");
    } finally { setSaving(false); }
  }

  async function openAttendance(activity: Activity) {
    setSelectedActivityId(activity.id); setError(null); setParticipantUserId("");
    try {
      const rows = await resaRequest<Participant[]>(`/v1/youth/activities/${encodeURIComponent(activity.id)}/participants`);
      setParticipants(rows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a lista de presença.");
    }
  }

  async function registerParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedActivity || !participantUserId || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await resaRequest(`/v1/youth/activities/${encodeURIComponent(selectedActivity.id)}/participants`, {
        method: "POST", body: JSON.stringify({ user_id: participantUserId }),
      });
      const rows = await resaRequest<Participant[]>(`/v1/youth/activities/${encodeURIComponent(selectedActivity.id)}/participants`);
      setParticipants(rows); setParticipantUserId(""); setMessage("Participante registado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar o participante.");
    } finally { setSaving(false); }
  }

  async function setAttendance(participant: Participant, status: Participant["status"]) {
    if (!selectedActivity || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await resaRequest<Participant>(
        `/v1/youth/activities/${encodeURIComponent(selectedActivity.id)}/participants/${encodeURIComponent(participant.user_id)}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setParticipants((items) => items.map((item) => item.user_id === participant.user_id ? { ...item, ...updated } : item));
      const updatedReport = await resaRequest<Report>(`/v1/youth/activities/organization/${encodeURIComponent(organizationId)}/report`).catch(() => null);
      setReport(updatedReport); setMessage("Presença atualizada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a presença.");
    } finally { setSaving(false); }
  }

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Agenda e participação</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">Atividades e relatórios operacionais</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Planeie reuniões, acampamentos, formação, missão e serviço comunitário. Registe participação e consulte indicadores calculados a partir dos registos reais da organização.</p>
        </div>
        <OrganizationSelector value={organizationId} onChange={(id, org) => void selectOrganization(id, org)} />
      </div>
      {organization && <p className="mt-2 text-xs text-slate-500">Organização: <strong className="text-slate-700">{organization.name}</strong></p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {report && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Clubes ativos", report.clubs_active], ["Membros ativos únicos", report.active_members_unique],
            ["Atividades", report.activities_total], ["Próximas", report.activities_upcoming],
            ["Presenças confirmadas", report.attendance_confirmed], ["Investiduras concluídas", report.investitures_completed],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-[#F8F9FB] p-4">
              <p className="text-xs leading-5 text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{Number(value).toLocaleString("pt-PT")}</p>
            </div>
          ))}
          <div className="col-span-full flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Total de clubes: {report.clubs_total}</span><span>Atividades concluídas: {report.activities_completed}</span>
            <span>Progressos em curso: {report.progress_in_progress}</span><span>Progressos concluídos/verificados: {report.progress_completed}</span>
            <span>Investiduras pendentes: {report.investitures_requested}</span>
          </div>
        </div>
        {report.by_program && report.by_program.length > 0 && (
          <div className="col-span-full mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-100 bg-[#F8F9FB] px-4 py-3"><h3 className="text-sm font-semibold text-[#0C1A3D]">Resumo por programa</h3></div>
            <div className="divide-y divide-slate-100">
              {report.by_program.map((item) => (
                <div key={item.program_id} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                  <span className="font-semibold text-slate-700">{item.program_id}</span><span className="text-slate-500">Clubes: {item.clubs}</span><span className="text-slate-500">Matrículas ativas: {item.active_memberships}</span><span className="text-slate-500">Atividades: {item.activities}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      )}

      {organizationId && (
        <div className="mt-6">
          <label className="block max-w-xl text-sm font-medium text-slate-700">Clube ativo
            <select value={clubId} onChange={(event) => setClubId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              {clubs.length === 0 && <option value="">Nenhum clube ativo disponível</option>}
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {loading ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">A carregar agenda e relatórios…</p> : selectedClub && (
        <div className="mt-7 grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-[#0C1A3D]">{editingActivityId ? "Editar atividade" : "Registar atividade"}</h3>
            <form onSubmit={saveActivity} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Título<input required minLength={2} maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm font-medium text-slate-700">Tipo<select value={form.activity_type} onChange={(event) => setForm({ ...form, activity_type: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2">{ACTIVITY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Início<input required type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <label className="text-sm font-medium text-slate-700">Fim<input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              </div>
              <label className="block text-sm font-medium text-slate-700">Local<input maxLength={240} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm font-medium text-slate-700">Responsável designado<select value={form.leader_user_id} onChange={(event) => setForm({ ...form, leader_user_id: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">A definir</option>{activeMembers.filter((member) => clubLeaderIds.includes(member.userId) && profiles[member.userId]).map((member) => <option key={member.userId} value={member.userId}>{personName(profiles[member.userId])}</option>)}</select></label>
              <label className="block text-sm font-medium text-slate-700">Descrição<textarea rows={3} maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A guardar…" : editingActivityId ? "Guardar alterações" : "Registar atividade"}</button>{editingActivityId && <button type="button" disabled={saving} onClick={cancelActivityEdit} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar edição</button>}</div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0C1A3D]">Agenda do clube <span className="text-sm font-normal text-slate-500">({activities.length})</span></h3>
            {activities.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">Ainda não há atividades registadas para este clube.</p> : activities.map((activity) => (
              <article key={activity.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9B7A34]">{ACTIVITY_TYPES.find(([value]) => value === activity.activity_type)?.[1] ?? activity.activity_type}</p><h4 className="mt-1 text-lg font-semibold text-[#0C1A3D]">{activity.title}</h4><p className="mt-1 text-sm text-slate-600">{dateLabel(activity.starts_at)}{activity.location ? ` · ${activity.location}` : ""}</p>{activity.description && <p className="mt-2 text-sm leading-6 text-slate-500">{activity.description}</p>}</div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{activity.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => editActivity(activity)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D]">Editar</button><button type="button" onClick={() => void openAttendance(activity)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D]">Participantes e presenças</button>
                  {activity.status === "PLANNED" && <button type="button" disabled={saving} onClick={() => void changeActivityStatus(activity, "ONGOING")} className="rounded-lg border border-[#C8A24A] px-3 py-1.5 text-xs font-semibold">Iniciar</button>}
                  {activity.status === "ONGOING" && <button type="button" disabled={saving} onClick={() => void changeActivityStatus(activity, "COMPLETED")} className="rounded-lg bg-[#0C1A3D] px-3 py-1.5 text-xs font-semibold text-white">Concluir</button>}
                  {activity.status !== "COMPLETED" && activity.status !== "CANCELLED" && <button type="button" disabled={saving} onClick={() => void changeActivityStatus(activity, "CANCELLED")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Cancelar</button>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedActivity && (
        <section className="mt-8 rounded-2xl border border-[#C8A24A]/40 bg-[#FBF8F0] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A6B2B]">Presenças</p><h3 className="mt-1 text-xl font-semibold text-[#0C1A3D]">{selectedActivity.title}</h3></div><button type="button" onClick={() => setSelectedActivityId("")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Fechar</button></div>
          <form onSubmit={registerParticipant} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select required value={participantUserId} onChange={(event) => setParticipantUserId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">Adicionar membro ativo</option>{activeMembers.filter((member) => !participants.some((item) => item.user_id === member.userId)).map((member) => <option key={member.userId} value={member.userId}>{personName(profiles[member.userId])}</option>)}</select>
            <button type="submit" disabled={saving || !participantUserId} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Registar participante</button>
          </form>
          <div className="mt-4 space-y-2">
            {participants.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Ainda não há participantes registados.</p> : participants.map((participant) => (
              <div key={participant.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div><p className="text-sm font-semibold text-slate-800">{personName(profiles[participant.user_id])}</p><p className="text-xs text-slate-500">{participant.status}</p></div>
                <div className="flex flex-wrap gap-2">
                  {participant.status === "CANCELLED" && <button type="button" disabled={saving} onClick={() => void setAttendance(participant, "REGISTERED")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Reativar inscrição</button>}
                  {participant.status !== "ATTENDED" && participant.status !== "CANCELLED" && <button type="button" disabled={saving} onClick={() => void setAttendance(participant, "ATTENDED")} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">Presente</button>}
                  {participant.status !== "ABSENT" && <button type="button" disabled={saving} onClick={() => void setAttendance(participant, "ABSENT")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Ausente</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
