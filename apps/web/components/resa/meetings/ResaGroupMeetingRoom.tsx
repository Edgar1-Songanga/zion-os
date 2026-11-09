"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { resaRequest } from "@/lib/resa/api";

type MeetingRole = "HOST" | "MODERATOR" | "PRESENTER" | "PARTICIPANT" | "VIEWER";
type MeetingParticipant = {
  user_id: string;
  participant_role: MeetingRole;
  status: string;
  joined_at?: string | null;
  display_name?: string;
  avatar_url?: string | null;
};
type MeetingMessage = {
  id: string;
  meeting_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type JoinConfig = { joinUrl: string; token: string; roomId: string };

export default function ResaGroupMeetingRoom({
  meetingId,
  title,
  role,
  participants,
  userId,
  onLeave,
  onRefresh,
}: {
  meetingId: string;
  title: string;
  role: MeetingRole;
  participants: MeetingParticipant[];
  userId: string;
  onLeave: () => void;
  onRefresh: () => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const remoteScreenRef = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [chat, setChat] = useState<MeetingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canShareScreen = ["HOST", "MODERATOR", "PRESENTER"].includes(role);
  const canPublish = role !== "VIEWER";

  const refreshPeople = useCallback((room: Room) => {
    setPeople([
      room.localParticipant.identity,
      ...Array.from(room.remoteParticipants.values()).map((participant) => participant.identity),
    ]);
  }, []);

  const loadChat = useCallback(async () => {
    try {
      const rows = await resaRequest<MeetingMessage[]>(
        `/v1/resa/group-meetings/${meetingId}/messages?limit=100`,
      );
      setChat(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o chat.");
    }
  }, [meetingId]);

  useEffect(() => {
    let active = true;
    let presenceSet = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachTrack = (track: any, participant: any) => {
      if (!participant?.identity) return;
      const isScreenShare = track.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video;
      const target = isScreenShare ? remoteScreenRef.current : remoteRef.current;
      if (!target) return;
      const element = track.attach() as HTMLMediaElement;
      element.autoplay = true;
      element.dataset.participant = participant.identity;
      element.dataset.trackSource = String(track.source ?? "media");
      if (track.kind === Track.Kind.Video) {
        const video = element as HTMLVideoElement;
        video.playsInline = true;
        video.className = "h-full min-h-[180px] w-full rounded-2xl bg-black object-contain";
        const tile = document.createElement("div");
        tile.className = "relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950";
        tile.dataset.participant = participant.identity;
        tile.dataset.trackSource = String(track.source ?? 'media');
        tile.appendChild(video);
        const label = document.createElement("span");
        label.className = "absolute bottom-2 left-2 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-semibold text-white";
        label.textContent = (participant.name || participant.identity) + (isScreenShare ? " · Ecrã partilhado" : "");
        tile.appendChild(label);
        target.appendChild(tile);
      } else {
        element.className = "sr-only";
        target.appendChild(element);
      }
      void element.play().catch(() => {
        if (active) setError("O navegador bloqueou a reprodução automática. Interage com a página para ativar o áudio.");
      });
    };

    const detachTrack = (track: any, identity: string) => {
      const source = String(track.source ?? 'media');
      [remoteRef.current, remoteScreenRef.current].forEach((container) => container?.querySelectorAll("[data-participant]").forEach((node) => {
        const element = node as HTMLElement;
        if (element.dataset.participant === identity && element.dataset.trackSource === source) element.remove();
      }));
    };

    room
      .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => attachTrack(track, participant))
      .on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => detachTrack(track, participant.identity))
      .on(RoomEvent.ParticipantConnected, () => refreshPeople(room))
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        [remoteRef.current, remoteScreenRef.current].forEach((container) => container?.querySelectorAll("[data-participant]").forEach((node) => {
          if ((node as HTMLElement).dataset.participant === participant.identity) node.remove();
        }));
        refreshPeople(room);
      })
      .on(RoomEvent.DataReceived, (payload) => {
        try {
          const packet = JSON.parse(new TextDecoder().decode(payload)) as MeetingMessage;
          if (packet?.id && packet.meeting_id === meetingId) {
            setChat((current) => current.some((item) => item.id === packet.id) ? current : [...current, packet].slice(-200));
          }
        } catch {
          // Ignore unrelated or malformed data packets.
        }
      })
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) setScreenShareOn(true);
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) setScreenShareOn(false);
      })
      .on(RoomEvent.Disconnected, () => {
        if (active) setConnected(false);
      });

    async function connect() {
      try {
        const config = await resaRequest<JoinConfig>(`/v1/resa/group-meetings/${meetingId}/join`, { method: "POST" });
        if (!active) return;
        if (!config.joinUrl || !config.token) throw new Error("A configuração de ligação está incompleta.");
        await room.connect(config.joinUrl, config.token, { autoSubscribe: true });
        if (!active) {
          room.disconnect();
          return;
        }
        await resaRequest(`/v1/resa/group-meetings/${meetingId}/presence`, {
          method: "POST",
          body: JSON.stringify({ status: "PRESENT" }),
        });
        presenceSet = true;
        setConnected(true);
        setConnecting(false);
        refreshPeople(room);
        await loadChat();
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Não foi possível entrar na reunião.");
          setConnecting(false);
        }
        room.disconnect();
      }
    }

    void connect();
    return () => {
      active = false;
      room.disconnect();
      roomRef.current = null;
      if (presenceSet) {
        void resaRequest(`/v1/resa/group-meetings/${meetingId}/presence`, {
          method: "POST",
          body: JSON.stringify({ status: "LEFT" }),
        }).then(() => onRefresh()).catch(() => {});
      }
    };
  }, [meetingId, loadChat, onRefresh, refreshPeople]);

  const setCamera = async () => {
    const room = roomRef.current;
    if (!room || !canPublish) return;
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn);
      setCameraOn(!cameraOn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a câmara.");
    }
  };

  const setMicrophone = async () => {
    const room = roomRef.current;
    if (!room || !canPublish) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!microphoneOn);
      setMicrophoneOn(!microphoneOn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o microfone.");
    }
  };

  const setScreenShare = async () => {
    const room = roomRef.current;
    if (!room || !canShareScreen) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!screenShareOn, { audio: true });
      setScreenShareOn(!screenShareOn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A partilha de ecrã não está disponível neste dispositivo.");
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy("chat");
    try {
      const message = await resaRequest<MeetingMessage>(`/v1/resa/group-meetings/${meetingId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setChat((current) => [...current, message].slice(-200));
      await roomRef.current?.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(message)),
        { reliable: true, topic: "resa-group-meeting-chat" },
      );
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      setBusy(null);
    }
  };

  const changePresenter = async (targetId: string, enabled: boolean) => {
    setBusy(targetId);
    try {
      await resaRequest(`/v1/resa/group-meetings/${meetingId}/participants/${targetId}/presenter`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar as permissões de apresentação.");
    } finally {
      setBusy(null);
    }
  };

  const removeParticipant = async (targetId: string) => {
    setBusy(targetId);
    try {
      await resaRequest(`/v1/resa/group-meetings/${meetingId}/participants/${targetId}/remove`, { method: "POST" });
      onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover o participante.");
    } finally {
      setBusy(null);
    }
  };

  const remotePeople = useMemo(() => people.filter((id) => id !== userId), [people, userId]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#071326] text-white shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Reunião RESA</p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">{connected ? "Ligado ao espaço de reunião" : connecting ? "A estabelecer ligação..." : "Ligação encerrada"}</p>
        </div>
        <button onClick={onLeave} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Sair da reunião</button>
      </header>

      {error && <div role="alert" className="border-b border-rose-900/70 bg-rose-950/50 px-5 py-3 text-sm text-rose-200">{error}</div>}

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div ref={remoteScreenRef} aria-label="Palco de ecrãs partilhados" className="empty:hidden mb-3 grid min-h-[220px] gap-3 rounded-2xl border border-emerald-300/20 bg-black/60 p-3" />
          <div ref={remoteRef} className="grid min-h-[320px] auto-rows-fr grid-cols-1 gap-3 rounded-2xl bg-black/30 p-2 sm:grid-cols-2">
            {!remotePeople.length && (
              <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center text-center text-slate-400">
                <span className="text-3xl">◉</span>
                <p className="mt-3 text-sm font-medium">{connecting ? "A preparar a sala..." : "Estás na sala de reunião"}</p>
                <p className="mt-1 text-xs">Os vídeos e ecrãs partilhados aparecerão aqui.</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button disabled={!connected || !canPublish} onClick={() => void setMicrophone()} className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 ${microphoneOn ? "bg-sky-500 text-slate-950" : "bg-white/10 text-white"}`}>
              {microphoneOn ? "Desligar microfone" : "Ligar microfone"}
            </button>
            <button disabled={!connected || !canPublish} onClick={() => void setCamera()} className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 ${cameraOn ? "bg-sky-500 text-slate-950" : "bg-white/10 text-white"}`}>
              {cameraOn ? "Desligar câmara" : "Ligar câmara"}
            </button>
            <button disabled={!connected || !canShareScreen} onClick={() => void setScreenShare()} className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 ${screenShareOn ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white"}`}>
              {screenShareOn ? "Parar partilha" : "Partilhar ecrã"}
            </button>
          </div>
          {!canPublish && <p className="mt-3 text-center text-xs text-slate-400">Estás a participar como espectador; podes ver e ouvir, mas não publicar áudio ou vídeo.</p>}
          {canPublish && !canShareScreen && <p className="mt-3 text-center text-xs text-slate-400">A partilha de ecrã requer autorização do anfitrião ou de um moderador.</p>}
        </div>

        <aside className="flex min-h-[360px] flex-col rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold">Participantes ({people.length || participants.length})</p>
            <p className="mt-1 text-xs text-slate-400">O anfitrião e os moderadores controlam as permissões.</p>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto p-3">
            {participants.map((person) => (
              <div key={person.user_id} className="rounded-xl bg-white/[0.05] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{person.user_id === userId ? "Tu" : person.display_name || person.user_id.slice(0, 8) + "…"}</span>
                  <span className="text-[10px] text-slate-400">{person.participant_role}</span>
                </div>
                {["HOST", "MODERATOR"].includes(role) && person.user_id !== userId && !["HOST", "MODERATOR"].includes(person.participant_role) && ["ACCEPTED", "PRESENT"].includes(person.status) && (
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy === person.user_id} onClick={() => void changePresenter(person.user_id, person.participant_role !== "PRESENTER")} className="rounded-lg border border-sky-400/30 px-2 py-1 text-[10px] font-semibold text-sky-200 disabled:opacity-50">
                      {person.participant_role === "PRESENTER" ? "Retirar apresentação" : "Dar apresentação"}
                    </button>
                    <button disabled={busy === person.user_id} onClick={() => void removeParticipant(person.user_id)} className="rounded-lg border border-rose-400/30 px-2 py-1 text-[10px] font-semibold text-rose-200 disabled:opacity-50">Remover</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-white/10">
            <div className="px-4 py-3 text-sm font-semibold">Chat da reunião</div>
            <div className="max-h-64 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
              {chat.map((message) => (
                <div key={message.id} className="rounded-xl bg-white/[0.06] px-3 py-2">
                  <p className="text-[10px] font-semibold text-sky-200">{message.sender_id === userId ? "Tu" : message.sender_id.slice(0, 8) + "…"}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-200">{message.body}</p>
                </div>
              ))}
              {!chat.length && <p className="text-xs text-slate-500">Ainda não há mensagens.</p>}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={10000} placeholder="Escreve uma mensagem..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-400" />
              <button disabled={!draft.trim() || busy === "chat"} className="rounded-xl bg-sky-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Enviar</button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
