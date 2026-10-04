"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Program = { id: string; program_key: string; name: string; age_range: string; philosophy: string; active: boolean };
type Club = { id: string; name: string; motto?: string; church_name?: string; status: string; program_id: string };
type Member = { id: string; legal_name: string; consent_status: string; safeguarding_status: string; active: boolean };
type Activity = { id: string; title: string; activity_type: string; scheduled_on: string; status: string; participants_count: number; service_hours: number; spiritual_actions: number; skills_completed: number };
type Achievement = { id: string; title: string; verified: boolean; achieved_on: string; member_id: string };
type Overview = { programs: Program[]; clubs: Club[]; members: Member[]; activities: Activity[]; achievements: Achievement[]; metrics: { clubs: number; members: number; leaders: number; activities: number; completedActivities: number; participation: number; serviceHours: number; spiritualActions: number; skillsCompleted: number; verifiedAchievements: number; validCertificates: number } };

export default function YouthPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("A carregar o Ministério Jovem…");
  const [busy, setBusy] = useState(false);
  const [club, setClub] = useState({ program_id: "", name: "", motto: "", church_name: "" });
  const [member, setMember] = useState({ legal_name: "", date_of_birth: "", consent_status: "PENDING" });
  const [activity, setActivity] = useState({ club_id: "", title: "", activity_type: "SERVICE", scheduled_on: "", status: "PLANNED", participants_count: "0", service_hours: "0", spiritual_actions: "0", skills_completed: "0" });

  async function loadOrganizations() {
    try {
      const items = await resaRequest<Organization[]>("/v1/organizations");
      setOrganizations(items);
      if (items[0]) setOrganizationId(items[0].id);
      if (!items.length) setMessage("Nenhuma organização administrada foi encontrada.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."); }
  }
  const loadOverview = useCallback(async (id = organizationId) => {
    if (!id) return;
    try { setOverview(await resaRequest<Overview>(`/v1/youth/organizations/${id}/overview`)); setMessage(""); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar o Ministério Jovem."); }
  }, [organizationId]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadOrganizations(); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void loadOverview(); }, 0); return () => window.clearTimeout(timer); }, [loadOverview]);

  async function submit(event: FormEvent, path: string, body: unknown) {
    event.preventDefault(); if (!organizationId) return; setBusy(true);
    try { await resaRequest(path.replace(":organizationId", organizationId), { method: "POST", body: JSON.stringify(body) }); await loadOverview(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "A operação do Ministério Jovem falhou."); }
    finally { setBusy(false); }
  }
  async function verifyAchievement(id: string) {
    setBusy(true);
    try { await resaRequest(`/v1/youth/achievements/${id}/verify`, { method: "PATCH" }); await loadOverview(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível verificar a conquista."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-7xl space-y-8">
    <header className="rounded-3xl bg-[#0C1A3D] p-8 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Spiritual experience · Youth engine</p><h1 className="mt-3 text-4xl font-bold">Ministério Jovem</h1><p className="mt-3 max-w-3xl text-white/70">Aventura, discipulado, liderança, serviço e missão com dados operacionais verificáveis.</p><div className="mt-5 flex flex-wrap items-center gap-3"><label className="text-sm text-white/70">Organização<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="ml-3 rounded-xl px-3 py-2 text-[#0C1A3D]">{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></header>
    {message && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">{message}</div>}
    {overview && <>
      <section className="grid gap-5 md:grid-cols-4 lg:grid-cols-6">{[["Clubes", overview.metrics.clubs], ["Jovens", overview.metrics.members], ["Líderes", overview.metrics.leaders], ["Actividades", overview.metrics.activities], ["Horas de serviço", overview.metrics.serviceHours], ["Conquistas verificadas", overview.metrics.verifiedAchievements]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#0C1A3D]">{value}</p></div>)}</section>
      <section className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={(event) => submit(event, "/v1/youth/organizations/:organizationId/clubs", club)} className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Registar clube</h2><Field label="Programa" value={club.program_id} onChange={(value) => setClub({ ...club, program_id: value })} options={overview.programs.map((item) => ({ value: item.id, label: `${item.name} · ${item.age_range}` }))} /><Field label="Nome do clube" value={club.name} onChange={(value) => setClub({ ...club, name: value })} /><Field label="Igreja local" value={club.church_name} onChange={(value) => setClub({ ...club, church_name: value })} /><Field label="Lema" value={club.motto} onChange={(value) => setClub({ ...club, motto: value })} /><button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-50">Guardar clube</button></form>
        <form onSubmit={(event) => submit(event, "/v1/youth/organizations/:organizationId/members", { ...member, date_of_birth: member.date_of_birth || undefined })} className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Registar jovem</h2><p className="mt-2 text-sm text-slate-500">O consentimento permanece pendente até validação autorizada.</p><Field label="Nome legal" value={member.legal_name} onChange={(value) => setMember({ ...member, legal_name: value })} /><Field label="Data de nascimento" type="date" value={member.date_of_birth} onChange={(value) => setMember({ ...member, date_of_birth: value })} /><Field label="Consentimento" value={member.consent_status} onChange={(value) => setMember({ ...member, consent_status: value })} options={[{ value: "PENDING", label: "Pendente" }, { value: "GRANTED", label: "Concedido" }, { value: "NOT_REQUIRED", label: "Não requerido" }]} /><button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-50">Guardar jovem</button></form>
        <form onSubmit={(event) => submit(event, "/v1/youth/organizations/:organizationId/activities", { ...activity, participants_count: Number(activity.participants_count), service_hours: Number(activity.service_hours), spiritual_actions: Number(activity.spiritual_actions), skills_completed: Number(activity.skills_completed) })} className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Registar actividade</h2><Field label="Clube" value={activity.club_id} onChange={(value) => setActivity({ ...activity, club_id: value })} options={overview.clubs.map((item) => ({ value: item.id, label: item.name }))} /><Field label="Título" value={activity.title} onChange={(value) => setActivity({ ...activity, title: value })} /><Field label="Tipo" value={activity.activity_type} onChange={(value) => setActivity({ ...activity, activity_type: value })} options={["SPIRITUAL", "SERVICE", "TRAINING", "OUTREACH", "FELLOWSHIP"].map((value) => ({ value, label: value }))} /><Field label="Data" type="date" value={activity.scheduled_on} onChange={(value) => setActivity({ ...activity, scheduled_on: value })} /><Field label="Participantes" type="number" value={activity.participants_count} onChange={(value) => setActivity({ ...activity, participants_count: value })} /><Field label="Horas de serviço" type="number" value={activity.service_hours} onChange={(value) => setActivity({ ...activity, service_hours: value })} /><button disabled={busy} className="mt-5 rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold text-[#0C1A3D] disabled:opacity-50">Guardar actividade</button></form>
      </section>
      <section className="grid gap-6 lg:grid-cols-2"><Panel title="Programas">{overview.programs.map((item) => <div key={item.id} className="border-b border-slate-100 py-4 last:border-0"><p className="font-semibold text-[#0C1A3D]">{item.name} <span className="text-sm font-normal text-slate-500">({item.age_range})</span></p><p className="mt-1 text-sm text-slate-600">{item.philosophy}</p></div>)}</Panel><Panel title="Clubes"><div className="space-y-3">{overview.clubs.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-[#0C1A3D]">{item.name}</p><p className="text-sm text-slate-500">{item.church_name || "Igreja não indicada"} · {item.status}</p></div>)}{!overview.clubs.length && <p className="text-slate-500">Nenhum clube registado.</p>}</div></Panel></section>
      <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Conquistas e verificação</h2><div className="mt-4 space-y-3">{overview.achievements.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold text-[#0C1A3D]">{item.title}</p><p className="text-sm text-slate-500">{item.achieved_on} · membro {item.member_id}</p></div>{item.verified ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Verificada</span> : <button disabled={busy} onClick={() => void verifyAchievement(item.id)} className="rounded-lg bg-[#0C1A3D] px-3 py-2 text-sm font-semibold text-white">Verificar</button>}</div>)}{!overview.achievements.length && <p className="text-slate-500">Nenhuma conquista registada.</p>}</div></section>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Protecção de menores: os dados de consentimento e salvaguarda são organization-scoped e os incidentes restritos só devem ser acessíveis a utilizadores com a permissão <code>youth.safeguarding.read</code>.</p>
    </>}
  </div></main>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">{title}</h2><div className="mt-4">{children}</div></div>; }
function Field({ label, value, onChange, type = "text", options }: { label: string; value: string; onChange: (value: string) => void; type?: string; options?: Array<{ value: string; label: string }> }) { return <label className="mt-4 block text-sm font-semibold text-slate-700">{label}{options ? <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" required><option value="">Selecione…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={label !== "Igreja local" && label !== "Lema" && label !== "Data de nascimento"} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" />}</label>; }
