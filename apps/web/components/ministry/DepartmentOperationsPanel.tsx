"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import type { Ministry } from "./types";

type RetentionDomain = "SABBATH_SCHOOL_ATTENDANCE" | "PERSONAL_MINISTRY_FOLLOW_UP";
type RetentionPolicy = { data_domain: RetentionDomain; retention_days: number; approved_policy_label: string; confirmed_at: string };
type SabbathClass = { id: string; name: string; meeting_day: number | null; meeting_time: string | null; room_label: string | null; is_active: boolean };
type RosterMember = { member_record_id: string; first_name: string; last_name: string };
type Session = { id: string; attendance_date: string; lesson_reference: string | null; recorded_at: string };
type FollowUp = { id: string; display_name: string; contact_method: "IN_PERSON" | "PHONE" | "EMAIL"; contact_locator: string; consent_method: string; assigned_to: string; follow_up_status: string; expires_at: string };
type StewardshipReport = { id: string; period_start: string; period_end: string; activities_count: number; programs_completed_count: number; participants_count: number | null; materials_distributed_count: number };
type Candidate = { id: string; first_name: string; last_name: string };

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const FOLLOW_UP_STATES = [
  ["NEW", "Novo"], ["CONTACT_ATTEMPTED", "Contacto tentado"], ["MEETING_SCHEDULED", "Encontro marcado"],
  ["BIBLE_STUDY_STARTED", "Estudo bíblico iniciado"], ["DECLINED", "Não pretende continuar"], ["COMPLETED", "Concluído"],
] as const;
const STATUS_LABEL: Record<string, string> = { PRESENT: "Presente", ABSENT: "Ausente", EXCUSED: "Justificada", NEW: "Novo", CONTACT_ATTEMPTED: "Contacto tentado", MEETING_SCHEDULED: "Encontro marcado", BIBLE_STUDY_STARTED: "Estudo iniciado", DECLINED: "Não pretende continuar", COMPLETED: "Concluído" };

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function monthEnd() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`; }

function FieldLabel({ children }: { children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-semibold text-slate-600">{children}</label>; }
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20";
const buttonClass = "rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#182c58] disabled:cursor-not-allowed disabled:bg-slate-300";

export default function DepartmentOperationsPanel({ ministry, organizationId }: { ministry: Ministry; organizationId: string }) {
  const isSabbathPersonal = ministry.department === "sabbath-school-personal-ministries";
  const isStewardship = ministry.department === "stewardship";
  const [tab, setTab] = useState<"sabbath" | "personal" | "stewardship">(isStewardship ? "stewardship" : "sabbath");
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [retentionDays, setRetentionDays] = useState<Record<RetentionDomain, string>>({ SABBATH_SCHOOL_ATTENDANCE: "", PERSONAL_MINISTRY_FOLLOW_UP: "" });
  const [policyLabel, setPolicyLabel] = useState<Record<RetentionDomain, string>>({ SABBATH_SCHOOL_ATTENDANCE: "", PERSONAL_MINISTRY_FOLLOW_UP: "" });
  const [policyConfirmed, setPolicyConfirmed] = useState<Record<RetentionDomain, boolean>>({ SABBATH_SCHOOL_ATTENDANCE: false, PERSONAL_MINISTRY_FOLLOW_UP: false });
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    try {
      const rows = await resaRequest<RetentionPolicy[]>(`/v1/department-operations/retention/${organizationId}`);
      setPolicies(rows ?? []);
    } catch (reason) {
      setPolicies([]);
      // RLS deliberately makes a missing read permission indistinguishable from an unavailable policy.
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar a política de conservação.");
    }
  }, [organizationId]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => { if (active) setUserId(data.user?.id ?? ""); });
    void loadPolicies();
    return () => { active = false; };
  }, [loadPolicies]);

  const policyFor = (domain: RetentionDomain) => policies.find((policy) => policy.data_domain === domain) ?? null;
  const hasSabbathRetention = Boolean(policyFor("SABBATH_SCHOOL_ATTENDANCE"));
  const hasPersonalRetention = Boolean(policyFor("PERSONAL_MINISTRY_FOLLOW_UP"));

  async function savePolicy(domain: RetentionDomain) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await resaRequest(`/v1/department-operations/retention/${organizationId}`, {
        method: "PUT", body: JSON.stringify({ data_domain: domain, retention_days: Number(retentionDays[domain]), approved_policy_label: policyLabel[domain], policy_confirmed: policyConfirmed[domain] }),
      });
      await loadPolicies();
      setPolicyConfirmed((value) => ({ ...value, [domain]: false }));
      setNotice("Prazo de conservação guardado. O responsável deve garantir que corresponde à política local aprovada.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível guardar a política."); }
    finally { setBusy(false); }
  }

  if (!isSabbathPersonal && !isStewardship) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B772A]">Operações departamentais · fase 2</p>
        <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{ministry.name}</h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">Funcionalidades específicas com acesso limitado por organização e departamento. A Secretaria e os registos de dízimos/ofertas não são alterados nem expostos por estes fluxos.</p>
        {isSabbathPersonal && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab("sabbath")} className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === "sabbath" ? "bg-[#0C1A3D] text-white" : "border border-slate-200 text-slate-600"}`}>Escola Sabatina</button>
            <button type="button" onClick={() => setTab("personal")} className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === "personal" ? "bg-[#0C1A3D] text-white" : "border border-slate-200 text-slate-600"}`}>Ministério Pessoal</button>
          </div>
        )}
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {isSabbathPersonal && tab === "sabbath" && <SabbathOperations ministry={ministry} organizationId={organizationId} retention={policyFor("SABBATH_SCHOOL_ATTENDANCE")} userId={userId} busy={busy} setBusy={setBusy} setError={setError} setNotice={setNotice} />}
        {isSabbathPersonal && tab === "personal" && <PersonalMinistryOperations ministry={ministry} organizationId={organizationId} retention={policyFor("PERSONAL_MINISTRY_FOLLOW_UP")} userId={userId} busy={busy} setBusy={setBusy} setError={setError} setNotice={setNotice} />}
        {isStewardship && <StewardshipOperations ministry={ministry} organizationId={organizationId} busy={busy} setBusy={setBusy} setError={setError} setNotice={setNotice} />}
        {isSabbathPersonal && (
          <div className="border-t border-slate-100 pt-5">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Configurar prazo de conservação aprovado pela igreja (administração da organização)</summary>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Não existe prazo predefinido. A política local aprovada determina o número de dias. Sem este registo, o sistema bloqueia a gravação de presenças/roster e contactos. Os registos ficam inacessíveis após expirar e são purgados na próxima consulta do módulo; não há processo de limpeza em segundo plano nesta fase.</p>
              <RetentionEditor domain="SABBATH_SCHOOL_ATTENDANCE" value={retentionDays.SABBATH_SCHOOL_ATTENDANCE} label={policyLabel.SABBATH_SCHOOL_ATTENDANCE} confirmed={policyConfirmed.SABBATH_SCHOOL_ATTENDANCE} busy={busy} setValue={(v) => setRetentionDays((x) => ({ ...x, SABBATH_SCHOOL_ATTENDANCE: v }))} setLabel={(v) => setPolicyLabel((x) => ({ ...x, SABBATH_SCHOOL_ATTENDANCE: v }))} setConfirmed={(v) => setPolicyConfirmed((x) => ({ ...x, SABBATH_SCHOOL_ATTENDANCE: v }))} onSave={() => void savePolicy("SABBATH_SCHOOL_ATTENDANCE")} current={policyFor("SABBATH_SCHOOL_ATTENDANCE")} />
              <RetentionEditor domain="PERSONAL_MINISTRY_FOLLOW_UP" value={retentionDays.PERSONAL_MINISTRY_FOLLOW_UP} label={policyLabel.PERSONAL_MINISTRY_FOLLOW_UP} confirmed={policyConfirmed.PERSONAL_MINISTRY_FOLLOW_UP} busy={busy} setValue={(v) => setRetentionDays((x) => ({ ...x, PERSONAL_MINISTRY_FOLLOW_UP: v }))} setLabel={(v) => setPolicyLabel((x) => ({ ...x, PERSONAL_MINISTRY_FOLLOW_UP: v }))} setConfirmed={(v) => setPolicyConfirmed((x) => ({ ...x, PERSONAL_MINISTRY_FOLLOW_UP: v }))} onSave={() => void savePolicy("PERSONAL_MINISTRY_FOLLOW_UP")} current={policyFor("PERSONAL_MINISTRY_FOLLOW_UP")} />
            </details>
          </div>
        )}
      </div>
    </section>
  );
}

function RetentionEditor({ domain, value, label, confirmed, busy, setValue, setLabel, setConfirmed, onSave, current }: {
  domain: RetentionDomain; value: string; label: string; confirmed: boolean; busy: boolean;
  setValue: (value: string) => void; setLabel: (value: string) => void; setConfirmed: (value: boolean) => void; onSave: () => void; current: RetentionPolicy | null;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-800">{domain === "SABBATH_SCHOOL_ATTENDANCE" ? "Presenças e roster da Escola Sabatina" : "Acompanhamento do Ministério Pessoal"}</p>
      {current && <p className="mt-1 text-xs text-emerald-700">Ativo: {current.retention_days} dias · {current.approved_policy_label}</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel>Dias de conservação<input type="number" min={1} max={3650} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Definido na política local" className={inputClass} /></FieldLabel>
        <FieldLabel>Referência/nome da política aprovada<input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} placeholder="Ex.: política de proteção de dados, secção 4" className={inputClass} /></FieldLabel>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />Confirmo que sou responsável autorizado e que este prazo corresponde à política aprovada para esta organização.</label>
      <button type="button" disabled={busy || !value || !label.trim() || !confirmed} onClick={onSave} className={`${buttonClass} mt-3`}>Guardar confirmação do prazo</button>
    </div>
  );
}

function SabbathOperations({ ministry, organizationId, retention, userId, busy, setBusy, setError, setNotice }: {
  ministry: Ministry; organizationId: string; retention: RetentionPolicy | null; userId: string; busy: boolean;
  setBusy: (value: boolean) => void; setError: (value: string | null) => void; setNotice: (value: string | null) => void;
}) {
  const [classes, setClasses] = useState<SabbathClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionRows, setSessionRows] = useState<Array<{ member_record_id: string; attendance_status: string }>>([]);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [room, setRoom] = useState("");
  const [selfAsTeacher, setSelfAsTeacher] = useState(false);
  const [date, setDate] = useState(localDate());
  const [lesson, setLesson] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [candidateError, setCandidateError] = useState("");

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const loadClasses = useCallback(async () => {
    const rows = await resaRequest<SabbathClass[]>(`/v1/department-operations/sabbath/classes?organizationId=${organizationId}`);
    setClasses(rows ?? []);
    setSelectedClassId((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? ""));
  }, [organizationId]);
  const loadClassData = useCallback(async (classId: string) => {
    if (!classId) { setRoster([]); setSessions([]); return; }
    const [members, attendanceSessions] = await Promise.all([
      resaRequest<RosterMember[]>(`/v1/department-operations/sabbath/classes/${classId}/roster`),
      resaRequest<Session[]>(`/v1/department-operations/sabbath/classes/${classId}/sessions`),
    ]);
    setRoster(members ?? []); setSessions(attendanceSessions ?? []); setStatuses({});
  }, []);
  useEffect(() => { void loadClasses().catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar turmas.")); }, [loadClasses, setError]);
  useEffect(() => { void loadClassData(selectedClassId).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar a turma.")); }, [selectedClassId, loadClassData, setError]);
  useEffect(() => {
    void resaRequest<Candidate[]>(`/v1/department-operations/sabbath/member-candidates?organizationId=${organizationId}`)
      .then((rows) => { setCandidates(rows ?? []); setCandidateError(""); })
      .catch((e) => { setCandidates([]); setCandidateError(e instanceof Error ? e.message : "A seleção de membros requer a permissão de leitura do cadastro."); });
  }, [organizationId]);

  async function createClass() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await resaRequest("/v1/department-operations/sabbath/classes", { method: "POST", body: JSON.stringify({ organization_id: organizationId, ministry_id: ministry.id, name, meeting_day: day ? Number(day) : null, room_label: room || null, teacher_user_id: selfAsTeacher ? userId || null : null }) });
      setName(""); setRoom(""); setDay(""); setSelfAsTeacher(false); await loadClasses(); setNotice("Turma criada. Para incluir membros, é necessária a permissão apropriada no cadastro.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar a turma."); }
    finally { setBusy(false); }
  }
  async function enroll() {
    if (!selectedClassId || !selectedMember) return;
    setBusy(true); setError(null); setNotice(null);
    try { await resaRequest(`/v1/department-operations/sabbath/classes/${selectedClassId}/members`, { method: "POST", body: JSON.stringify({ member_record_id: selectedMember }) }); setSelectedMember(""); await loadClassData(selectedClassId); setNotice("Membro associado à turma."); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível associar o membro. Verifique as permissões e o prazo de conservação."); }
    finally { setBusy(false); }
  }
  async function saveAttendance() {
    if (!retention) { setError("A administração da organização deve confirmar primeiro o prazo de conservação de presenças."); return; }
    if (!roster.length || roster.some((person) => !statuses[person.member_record_id])) { setError("Selecione um estado de presença para cada membro da turma antes de guardar."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      await resaRequest(`/v1/department-operations/sabbath/classes/${selectedClassId}/attendance`, { method: "POST", body: JSON.stringify({ attendance_date: date, lesson_reference: lesson || null, records: roster.map((person) => ({ member_record_id: person.member_record_id, attendance_status: statuses[person.member_record_id] })) }) });
      setStatuses({}); setLesson(""); await loadClassData(selectedClassId); setNotice("Presenças guardadas numa única operação. O prazo aprovado será aplicado; a purga física ocorre quando o módulo volta a ser consultado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registar presenças."); }
    finally { setBusy(false); }
  }
  async function openSession(sessionId: string) {
    setSelectedSession(sessionId);
    try { const rows = await resaRequest<Array<{ member_record_id: string; attendance_status: string }>>(`/v1/department-operations/sabbath/sessions/${sessionId}/attendance`); setSessionRows(rows ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar a sessão."); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">O sistema usa apenas referências a membros ativos já existentes, sem criar nem alterar o cadastro da Secretaria. O roster e as presenças só são guardados com prazo local de conservação confirmado.{retention ? ` Prazo atual: ${retention.retention_days} dias.` : " Prazo ainda não confirmado — escrita bloqueada."}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-[#0C1A3D]">Turmas e unidades</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel>Nome da turma<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputClass} placeholder="Ex.: Adultos · Unidade 1" /></FieldLabel>
            <FieldLabel>Dia de reunião<select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}><option value="">Por definir</option>{WEEKDAYS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></FieldLabel>
            <FieldLabel>Sala/local (opcional)<input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={120} className={inputClass} /></FieldLabel>
            <div className="flex items-end"><button type="button" disabled={busy || name.trim().length < 2} onClick={() => void createClass()} className={buttonClass}>Criar turma</button></div>
          </div>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={selfAsTeacher} onChange={(e) => setSelfAsTeacher(e.target.checked)} className="mt-1" />Atribuir a minha conta como professor/a desta turma</label>
          <FieldLabel>Turma selecionada<select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className={inputClass}><option value="">Selecione…</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? "" : " · inativa"}</option>)}</select></FieldLabel>
          {selectedClass && <p className="text-xs text-slate-500">{selectedClass.meeting_day == null ? "dia não definido" : WEEKDAYS[selectedClass.meeting_day]}{selectedClass.meeting_time ? ` · ${selectedClass.meeting_time}` : ""}{selectedClass.room_label ? ` · ${selectedClass.room_label}` : ""}</p>}
          {selectedClassId && (
            <>
            <div className="flex flex-wrap gap-2">
                <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className={`${inputClass} min-w-[240px] flex-1`}><option value="">Selecionar membro ativo…</option>{candidates.filter((candidate) => !roster.some((member) => member.member_record_id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.last_name}, {candidate.first_name}</option>)}</select>
                <button type="button" disabled={busy || !selectedMember || !retention} onClick={() => void enroll()} className={buttonClass}>Associar membro</button>
              </div>
              {candidateError && <p className="text-xs text-amber-700">A seleção de membros é limitada a contas com permissão de leitura do cadastro.</p>}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Roster ativo ({roster.length})</p>
                {roster.length === 0 && <p className="text-xs text-slate-400">Sem membros associados ou a política de conservação ainda não está ativa.</p>}
                {roster.map((person) => <div key={person.member_record_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{person.first_name} {person.last_name}</span></div>)}
              </div>
            </>
          )}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-[#0C1A3D]">Registo de presenças</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel>Data<input type="date" max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></FieldLabel>
            <FieldLabel>Referência da lição (opcional)<input value={lesson} onChange={(e) => setLesson(e.target.value)} maxLength={160} className={inputClass} placeholder="Trimestre · lição" /></FieldLabel>
          </div>
          {!retention && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Bloqueado até o administrador confirmar a política de conservação aplicável.</p>}
          {roster.map((person) => <div key={person.member_record_id} className="grid grid-cols-[1fr_130px] items-center gap-2 border-b border-slate-100 py-2"><span className="text-sm">{person.first_name} {person.last_name}</span><select aria-label={`Presença de ${person.first_name} ${person.last_name}`} value={statuses[person.member_record_id] ?? ""} onChange={(e) => setStatuses((s) => ({ ...s, [person.member_record_id]: e.target.value }))} className={inputClass}><option value="">Escolher…</option><option value="PRESENT">Presente</option><option value="ABSENT">Ausente</option><option value="EXCUSED">Justificada</option></select></div>)}
          <button type="button" disabled={busy || !selectedClassId || !retention || roster.length === 0} onClick={() => void saveAttendance()} className={buttonClass}>Guardar sessão de presenças</button>
          <p className="text-[11px] leading-5 text-slate-500">A sessão inteira é validada e gravada atomicamente. Cada turma/data só aceita uma sessão; a API rejeita duplicados.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold text-[#0C1A3D]">Histórico recente (limitado ao prazo)</h3>
        {sessions.length === 0 ? <p className="mt-2 text-sm text-slate-400">Ainda não há sessões disponíveis.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{sessions.map((session) => <button key={session.id} type="button" onClick={() => void openSession(session.id)} className={`rounded-xl border p-3 text-left text-sm ${selectedSession === session.id ? "border-[#C8A24A] bg-amber-50" : "border-slate-200"}`}><strong>{session.attendance_date}</strong><span className="ml-2 text-slate-500">{session.lesson_reference || "Sem referência de lição"}</span></button>)}</div>}
        {selectedSession && <div className="mt-3 flex flex-wrap gap-2">{sessionRows.map((row) => { const person = roster.find((member) => member.member_record_id === row.member_record_id); return <span key={row.member_record_id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs">{person ? `${person.first_name} ${person.last_name}` : "Membro"}: {STATUS_LABEL[row.attendance_status]}</span>; })}</div>}
      </div>
    </div>
  );
}

function PersonalMinistryOperations({ ministry, organizationId, retention, userId, busy, setBusy, setError, setNotice }: {
  ministry: Ministry; organizationId: string; retention: RetentionPolicy | null; userId: string; busy: boolean;
  setBusy: (value: boolean) => void; setError: (value: string | null) => void; setNotice: (value: string | null) => void;
}) {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [method, setMethod] = useState<FollowUp["contact_method"]>("IN_PERSON");
  const [locator, setLocator] = useState("");
  const [consentMethod, setConsentMethod] = useState("VERBAL");
  const [consent, setConsent] = useState(false);
  const [filter, setFilter] = useState("");
  const load = useCallback(async () => {
    const rows = await resaRequest<FollowUp[]>(`/v1/department-operations/personal-follow-ups?organizationId=${organizationId}&ministryId=${ministry.id}`);
    setItems(rows ?? []);
  }, [organizationId, ministry.id]);
  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar acompanhamentos.")); }, [load, setError]);

  async function create() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await resaRequest("/v1/department-operations/personal-follow-ups", { method: "POST", body: JSON.stringify({ organization_id: organizationId, ministry_id: ministry.id, display_name: displayName, contact_method: method, contact_locator: locator, consent_method: consentMethod, consent_confirmed: consent, assigned_to: userId }) });
      setDisplayName(""); setLocator(""); setConsent(false); await load(); setNotice("Contacto registado com consentimento e atribuído à sua conta.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registar o acompanhamento. Confirme consentimento e política de conservação."); }
    finally { setBusy(false); }
  }
  async function setStatus(item: FollowUp, status: string) {
    setBusy(true); setError(null); setNotice(null);
    try { await resaRequest(`/v1/department-operations/personal-follow-ups/${item.id}`, { method: "PATCH", body: JSON.stringify({ follow_up_status: status }) }); await load(); setNotice("Estado atualizado sem alterar os dados de consentimento nem prolongar a conservação."); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o estado."); }
    finally { setBusy(false); }
  }
  const visibleItems = useMemo(() => items.filter((item) => !filter || item.display_name.toLocaleLowerCase("pt").includes(filter.toLocaleLowerCase("pt"))), [items, filter]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">Só registe quem consentiu com este contacto e apenas os dados necessários para o próximo passo. Acompanhamentos sem notas livres; só a pessoa atribuída, a liderança do departamento e a administração podem ver os registos. Prazo: {retention ? `${retention.retention_days} dias` : "não confirmado — gravação bloqueada"}.</div>
      <div className="grid gap-3 md:grid-cols-2">
        <FieldLabel>Nome de referência<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} className={inputClass} placeholder="Nome usado para o contacto" /></FieldLabel>
        <FieldLabel>Forma de contacto<select value={method} onChange={(e) => setMethod(e.target.value as FollowUp["contact_method"])} className={inputClass}><option value="IN_PERSON">Presencial</option><option value="PHONE">Telefone</option><option value="EMAIL">Email</option></select></FieldLabel>
        <FieldLabel>{method === "IN_PERSON" ? "Referência mínima para o próximo encontro" : method === "PHONE" ? "Telefone" : "Email"}<input value={locator} onChange={(e) => setLocator(e.target.value)} maxLength={254} className={inputClass} placeholder={method === "IN_PERSON" ? "Ex.: após a reunião de sábado" : "Contacto fornecido pela pessoa"} /></FieldLabel>
        <FieldLabel>Consentimento registado por<select value={consentMethod} onChange={(e) => setConsentMethod(e.target.value)} className={inputClass}><option value="VERBAL">Verbal</option><option value="WRITTEN">Escrito</option><option value="DIGITAL">Digital</option></select></FieldLabel>
      </div>
      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />Confirmo que a pessoa aceitou este acompanhamento e que pode solicitar que cesse. Não introduzi notas pastorais, dados de saúde nem informação financeira.</label>
      <button type="button" disabled={busy || !retention || !userId || !displayName.trim() || !locator.trim() || !consent} onClick={() => void create()} className={buttonClass}>Registar acompanhamento consentido</button>
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-[#0C1A3D]">Acompanhamentos visíveis para esta conta</h3><p className="mt-1 text-xs text-slate-500">A liderança do departamento pode consultar os registos conforme as permissões RLS.</p></div><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar pelo nome" className={`${inputClass} max-w-xs`} /></div>
        {visibleItems.length === 0 && <p className="text-sm text-slate-400">Sem acompanhamentos ativos visíveis para esta conta.</p>}
        <div className="grid gap-3 lg:grid-cols-2">{visibleItems.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-800">{item.display_name}</h4><p className="mt-1 text-xs text-slate-500">{item.contact_method === "IN_PERSON" ? "Presencial" : item.contact_method === "PHONE" ? "Telefone" : "Email"}: {item.contact_locator}</p><p className="mt-1 text-[11px] text-slate-400">Expira em {item.expires_at.slice(0, 10)} · consentimento {item.consent_method.toLowerCase()}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px]">{STATUS_LABEL[item.follow_up_status]}</span></div><FieldLabel>Atualizar estado<select value={item.follow_up_status} disabled={busy} onChange={(e) => void setStatus(item, e.target.value)} className={`${inputClass} mt-3`}>{FOLLOW_UP_STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel></article>)}</div>
      </div>
    </div>
  );
}

function StewardshipOperations({ ministry, organizationId, busy, setBusy, setError, setNotice }: {
  ministry: Ministry; organizationId: string; busy: boolean; setBusy: (value: boolean) => void;
  setError: (value: string | null) => void; setNotice: (value: string | null) => void;
}) {
  const [reports, setReports] = useState<StewardshipReport[]>([]);
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(monthEnd());
  const [activities, setActivities] = useState("0");
  const [completed, setCompleted] = useState("0");
  const [participants, setParticipants] = useState("");
  const [materials, setMaterials] = useState("0");
  const load = useCallback(async () => {
    const rows = await resaRequest<StewardshipReport[]>(`/v1/department-operations/stewardship/reports?organizationId=${organizationId}&ministryId=${ministry.id}`);
    setReports(rows ?? []);
  }, [organizationId, ministry.id]);
  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar relatórios.")); }, [load, setError]);
  async function submit() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await resaRequest("/v1/department-operations/stewardship/reports", { method: "POST", body: JSON.stringify({ organization_id: organizationId, ministry_id: ministry.id, period_start: start, period_end: end, activities_count: Number(activities), programs_completed_count: Number(completed), participants_count: participants ? Number(participants) : null, materials_distributed_count: Number(materials) }) });
      await load(); setNotice("Relatório agregado guardado. Não inclui doadores, valores financeiros nem dados individuais.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar o relatório."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">Relatórios de Mordomia cobrem atividades, formação e materiais. Não há campos nem ligações para dízimos, ofertas, doadores, pagamentos ou a Tesouraria. O campo de participantes é ocultado (nulo) se o total for inferior a cinco.</div>
      <div className="grid gap-3 md:grid-cols-3">
        <FieldLabel>Início do período<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} /></FieldLabel>
        <FieldLabel>Fim do período<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} /></FieldLabel>
        <FieldLabel>Atividades realizadas<input type="number" min={0} max={10000} value={activities} onChange={(e) => setActivities(e.target.value)} className={inputClass} /></FieldLabel>
        <FieldLabel>Programas concluídos<input type="number" min={0} max={10000} value={completed} onChange={(e) => setCompleted(e.target.value)} className={inputClass} /></FieldLabel>
        <FieldLabel>Participantes agregados (mínimo 5)<input type="number" min={5} max={100000} value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Deixar vazio para suprimir" className={inputClass} /></FieldLabel>
        <FieldLabel>Materiais partilhados<input type="number" min={0} max={100000} value={materials} onChange={(e) => setMaterials(e.target.value)} className={inputClass} /></FieldLabel>
      </div>
      <button type="button" disabled={busy} onClick={() => void submit()} className={buttonClass}>Guardar relatório agregado do período</button>
      <div className="border-t border-slate-100 pt-5"><h3 className="font-semibold text-[#0C1A3D]">Relatórios anteriores</h3>{reports.length === 0 && <p className="mt-2 text-sm text-slate-400">Ainda não há relatórios neste departamento.</p>}<div className="mt-3 grid gap-3 md:grid-cols-2">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold">{report.period_start} — {report.period_end}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600"><dt>Atividades</dt><dd>{report.activities_count}</dd><dt>Programas concluídos</dt><dd>{report.programs_completed_count}</dd><dt>Participantes agregados</dt><dd>{report.participants_count === null ? "Suprimido" : report.participants_count}</dd><dt>Materiais partilhados</dt><dd>{report.materials_distributed_count}</dd></dl></article>)}</div></div>
    </div>
  );
}
