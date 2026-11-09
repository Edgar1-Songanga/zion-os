"use client";

import { useCallback, useEffect, useState } from "react";
import ResaIcon from "@/components/resa/core/ResaIcon";
import ResaGroupMeetingRoom from "@/components/resa/meetings/ResaGroupMeetingRoom";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type MeetingRole = "HOST" | "MODERATOR" | "PRESENTER" | "PARTICIPANT" | "VIEWER";
type MeetingStatus = "SCHEDULED" | "OPEN" | "ENDED" | "CANCELLED";
type MeetingParticipant = {
  user_id: string;
  participant_role: MeetingRole;
  status: string;
  joined_at?: string | null;
  display_name?: string;
  avatar_url?: string | null;
};
type MeetingSummary = {
  id: string;
  host_user_id: string;
  title: string;
  description?: string | null;
  visibility: "PUBLIC" | "INVITE_ONLY";
  status: MeetingStatus;
  scheduled_at: string;
  max_participants: number;
};
type MeetingDetails = MeetingSummary & {
  participants: MeetingParticipant[];
  room: { status: string; locked: boolean; lock_reason?: string | null } | null;
};
type SearchProfile = {
  entity_id: string;
  title: string;
  body?: string | null;
  avatar_url?: string | null;
};

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

function statusLabel(status: MeetingStatus) {
  return ({
    SCHEDULED: "Agendada",
    OPEN: "Em curso",
    ENDED: "Terminada",
    CANCELLED: "Cancelada",
  } as Record<MeetingStatus, string>)[status];
}

export default function ResaGroupMeetingsPage() {
  const [userId, setUserId] = useState("");
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState<MeetingDetails | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [visibility, setVisibility] = useState<"INVITE_ONLY" | "PUBLIC">("INVITE_ONLY");
  const [maxParticipants, setMaxParticipants] = useState("100");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [roleToInvite, setRoleToInvite] = useState<"PARTICIPANT" | "VIEWER" | "MODERATOR">("PARTICIPANT");
  const [searching, setSearching] = useState(false);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await resaRequest<MeetingSummary[]>("/v1/resa/group-meetings?limit=50");
      setMeetings(rows);
      if (selectedId && !rows.some((row) => row.id === selectedId)) {
        setSelectedId("");
        setDetails(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as reuniões.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetails = useCallback(async (meetingId: string) => {
    try {
      const row = await resaRequest<MeetingDetails>(`/v1/resa/group-meetings/${meetingId}`);
      setDetails(row);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os detalhes da reunião.");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? "");
    });
    void loadMeetings();
    return () => { active = false; };
  }, [loadMeetings]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetails(selectedId);
  }, [selectedId, loadDetails]);

  const refreshSelected = useCallback(async () => {
    await loadMeetings();
    if (selectedId) await loadDetails(selectedId);
  }, [loadDetails, loadMeetings, selectedId]);

  const createMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const row = await resaRequest<MeetingSummary>("/v1/resa/group-meetings", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          visibility,
          max_participants: Number(maxParticipants),
        }),
      });
      setTitle("");
      setDescription("");
      await loadMeetings();
      setSelectedId(row.id);
      await loadDetails(row.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a reunião.");
    } finally {
      setCreating(false);
    }
  };

  const action = async (key: string, path: string, method = "POST", body?: unknown) => {
    if (!details) return;
    setBusy(key);
    setError(null);
    try {
      await resaRequest(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      await refreshSelected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(null);
    }
  };

  const searchProfiles = async (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const rows = await resaRequest<SearchProfile[]>(
        `/v1/resa/search?q=${encodeURIComponent(search.trim())}&type=profile&limit=12`,
      );
      setProfiles(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível pesquisar membros.");
    } finally {
      setSearching(false);
    }
  };

  const inviteProfile = async (profile: SearchProfile) => {
    if (!details) return;
    setBusy(profile.entity_id);
    setError(null);
    try {
      await resaRequest(`/v1/resa/group-meetings/${details.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ user_id: profile.entity_id, role: roleToInvite }),
      });
      setProfiles((current) => current.filter((item) => item.entity_id !== profile.entity_id));
      await refreshSelected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o convite.");
    } finally {
      setBusy(null);
    }
  };

  const currentParticipant = details?.participants.find((item) => item.user_id === userId);
  const role = currentParticipant?.participant_role ?? "VIEWER";
  const isHost = details?.host_user_id === userId;
  const canModerate = ["HOST", "MODERATOR"].includes(role);
  const invited = currentParticipant?.status === "INVITED";
  const accepted = ["ACCEPTED", "PRESENT"].includes(currentParticipant?.status ?? "");
  const canJoin = details?.status === "OPEN" && accepted && !details.room?.locked;
  const canPublicJoin = details?.visibility === "PUBLIC"
    && ["SCHEDULED", "OPEN"].includes(details.status)
    && !currentParticipant;
  const canStart = canModerate && details?.status === "SCHEDULED" && details.room?.status === "READY";

  if (inRoom && details) {
    return (
      <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <ResaGroupMeetingRoom
            meetingId={details.id}
            title={details.title}
            role={role}
            participants={details.participants}
            userId={userId}
            onLeave={() => setInRoom(false)}
            onRefresh={refreshSelected}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] bg-[#071b34] p-6 text-white shadow-[0_20px_60px_rgba(8,21,47,0.15)] sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><ResaIcon name="live" size={19} /></span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">RESA · comunicação em tempo real</p>
                  <h1 className="text-3xl font-semibold tracking-tight">Reuniões de grupo</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Reuniões com anfitrião, moderação, participantes, espectadores, chat e partilha de ecrã com áudio.
              </p>
            </div>
            <button onClick={() => void loadMeetings()} disabled={loading} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">
              {loading ? "A atualizar..." : "Atualizar reuniões"}
            </button>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
          <form onSubmit={createMeeting} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0C1A3D]">Agendar reunião</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">A sala LiveKit é criada automaticamente e permanece fechada até o anfitrião iniciar a reunião.</p>
            <label className="mt-4 block text-xs font-semibold text-slate-600">Título
              <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={160} placeholder="Ex.: Reunião do Ministério Jovem" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-500" />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Descrição
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Objectivo e pontos a tratar" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-500" />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Data e hora
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-500" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600">Visibilidade
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as "INVITE_ONLY" | "PUBLIC")} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm">
                  <option value="INVITE_ONLY">Por convite</option>
                  <option value="PUBLIC">Pública</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">Limite
                <select value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm">
                  <option value="20">20 pessoas</option><option value="50">50 pessoas</option><option value="100">100 pessoas</option><option value="200">200 pessoas</option>
                </select>
              </label>
            </div>
            <button disabled={creating || !userId} className="mt-5 w-full rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {creating ? "A criar sala..." : "Criar reunião"}
            </button>
          </form>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0C1A3D]">Agenda e convites</h2>
                <span className="text-xs text-slate-500">{meetings.length} reuniões</span>
              </div>
              {loading && !meetings.length ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar...</div>
              ) : meetings.length ? (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <button key={meeting.id} onClick={() => setSelectedId(meeting.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === meeting.id ? "border-sky-400 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meeting.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel(meeting.status)}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{meeting.visibility === "PUBLIC" ? "Pública" : "Por convite"}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-[#0C1A3D]">{meeting.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{dateLabel(meeting.scheduled_at)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">Ainda não há reuniões.</p>
                  <p className="mt-1 text-xs text-slate-500">Cria uma reunião ou aguarda um convite.</p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {!details ? (
                <div className="flex min-h-60 flex-col items-center justify-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ResaIcon name="calendar" size={20} /></span>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Detalhes da reunião</p>
                  <p className="mt-1 text-xs text-slate-500">Selecciona uma reunião para ver convites e controlos.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600">{details.visibility === "PUBLIC" ? "Reunião pública" : "Reunião privada"}</p>
                      <h2 className="mt-1 text-lg font-semibold text-[#0C1A3D]">{details.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">{dateLabel(details.scheduled_at)}</p>
                    </div>
                    <button onClick={() => void loadDetails(details.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">Recarregar</button>
                  </div>
                  {details.description && <p className="mt-3 text-sm leading-6 text-slate-600">{details.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{details.participants.length} participantes</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Máx. {details.max_participants}</span>
                    {details.room?.locked && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Sala bloqueada</span>}
                  </div>

                  <div className="mt-5 space-y-2">
                    {invited && (
                      <div className="flex gap-2">
                        <button disabled={busy === "accept"} onClick={() => void action("accept", `/v1/resa/group-meetings/${details.id}/invitation-response`, "POST", { response: "ACCEPTED" })} className="flex-1 rounded-xl bg-[#0C1A3D] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Aceitar convite</button>
                        <button disabled={busy === "decline"} onClick={() => void action("decline", `/v1/resa/group-meetings/${details.id}/invitation-response`, "POST", { response: "DECLINED" })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Recusar</button>
                      </div>
                    )}
                    {canPublicJoin && <button disabled={busy === "public-join"} onClick={() => void action("public-join", `/v1/resa/group-meetings/${details.id}/public-join`)} className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Entrar como espectador</button>}
                    {canStart && <button disabled={busy === "start"} onClick={() => void action("start", `/v1/resa/group-meetings/${details.id}/start`)} className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Iniciar reunião</button>}
                    {canJoin && <button onClick={() => setInRoom(true)} className="w-full rounded-xl bg-sky-600 px-3 py-3 text-sm font-bold text-white">Entrar na reunião</button>}
                    {details.status === "SCHEDULED" && accepted && !canStart && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">O anfitrião ainda não iniciou a reunião.</p>}
                    {details.status === "OPEN" && details.room?.locked && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">A sala está bloqueada pelo anfitrião ou pela moderação.</p>}
                    {details.status === "ENDED" && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Esta reunião foi encerrada.</p>}
                  </div>

                  {canModerate && details.status === "OPEN" && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button disabled={busy === "lock"} onClick={() => void action("lock", `/v1/resa/group-meetings/${details.id}/room/lock`, "PATCH", { locked: !details.room?.locked })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{details.room?.locked ? "Desbloquear sala" : "Bloquear sala"}</button>
                      <button disabled={busy === "end"} onClick={() => void action("end", `/v1/resa/group-meetings/${details.id}/end`)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Encerrar reunião</button>
                    </div>
                  )}

                  {canModerate && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <h3 className="text-sm font-semibold text-[#0C1A3D]">Convidar membros</h3>
                      <form onSubmit={searchProfiles} className="mt-2 flex gap-2">
                        <input value={search} onChange={(event) => setSearch(event.target.value)} minLength={2} placeholder="Pesquisar nome de membro" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-500" />
                        <button disabled={searching || search.trim().length < 2} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{searching ? "..." : "Pesquisar"}</button>
                      </form>
                      <div className="mt-2 flex gap-2">
                        <select value={roleToInvite} onChange={(event) => setRoleToInvite(event.target.value as typeof roleToInvite)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs">
                          <option value="PARTICIPANT">Participante</option>
                          <option value="VIEWER">Espectador</option>
                          {isHost && <option value="MODERATOR">Moderador</option>}
                        </select>
                      </div>
                      <div className="mt-2 space-y-2">
                        {profiles.map((profile) => (
                          <div key={profile.entity_id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-700">{profile.title}</p>
                              {profile.body && <p className="truncate text-[10px] text-slate-500">{profile.body}</p>}
                            </div>
                            <button disabled={busy === profile.entity_id} onClick={() => void inviteProfile(profile)} className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">Convidar</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-[#0C1A3D]">Participantes e funções</h3>
                    <div className="mt-2 space-y-2">
                      {details.participants.map((person) => (
                        <div key={person.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                          <span className="truncate text-xs text-slate-700">{person.user_id === userId ? "Tu" : person.display_name || person.user_id.slice(0, 8) + "…"}</span>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-500">{person.participant_role} · {person.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
