"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { createMeetingRealtime } from "@/lib/governance/meeting-realtime";
import { getMeetingIceConfig } from "@/lib/governance/ice";
import { WebRtcSession } from "@/lib/governance/webrtc-session";
import { getMeetingControls, getMeetingParticipants, getMeetingMediaJoinConfig, getMeetingRoom, openMeetingRoom, getMeetingLifecycle, startMeeting, endMeeting, moderateMeetingParticipant, setSelfMeetingControl, type MeetingParticipant } from "@/lib/governance/meeting-api";
import { LiveKitMeetingSession } from "@/lib/governance/livekit-session";

type Props = { meetingId: string };
type MeetingSession = {
  startLocalMedia: () => Promise<MediaStream>;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
  setVideoEnabled: (enabled: boolean) => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  startMediaBroadcast: (element: HTMLMediaElement) => Promise<void>;
  stopMediaBroadcast: () => Promise<void>;
  getLocalStream: () => MediaStream;
  close: () => Promise<void>;
};

export default function MeetingRoom({ meetingId }: Props) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const mediaVideo = useRef<HTMLVideoElement>(null);
  const mediaAudio = useRef<HTMLAudioElement>(null);
  const mediaObjectUrl = useRef<string | null>(null);
  const endedHandled = useRef(false);
  const remoteVideos = useRef(new Map<string, HTMLVideoElement>());
  const sessionRef = useRef<MeetingSession | null>(null);
  const realtimeRef = useRef<Awaited<ReturnType<typeof createMeetingRealtime>> | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
  const [remoteScreenSharing, setRemoteScreenSharing] = useState<Record<string, boolean>>({});
  const [mic, setMic] = useState(false);
  const [camera, setCamera] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("A preparar a sala…");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [meetingStatus, setMeetingStatus] = useState("PLANNED");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFileType, setMediaFileType] = useState<"audio" | "video" | null>(null);
  const [mediaFileName, setMediaFileName] = useState("");
  const [mediaBroadcasting, setMediaBroadcasting] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [meetingActionBusy, setMeetingActionBusy] = useState(false);
  const [meetingNotice, setMeetingNotice] = useState<string | null>(null);
  const micState = useRef(mic);
  const cameraState = useRef(camera);
  micState.current = mic;
  cameraState.current = camera;

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    let controlsTimer: number | undefined;
    let lifecycleTimer: number | undefined;
    async function start() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) throw new Error("Sessão de autenticação não encontrada.");

        setCurrentUserId(authSession.user.id);
        const participantRows = await getMeetingParticipants(meetingId);
        setParticipants(participantRows);
        const moderator = participantRows.some((p) => p.user_id === authSession.user.id && ["HOST", "MODERATOR"].includes(p.participant_role) && ["INVITED", "ACCEPTED", "PRESENT"].includes(p.status));
        setIsModerator(moderator);

        let roomState = await getMeetingRoom(meetingId);
        if (roomState.status === "READY" && moderator) {
          setStatus("A abrir a sala de espera…");
          await openMeetingRoom(meetingId);
          roomState = await getMeetingRoom(meetingId);
        }
        while (active && roomState.status === "READY") {
          setStatus("À espera do anfitrião abrir a sala de espera…");
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
          if (!active) return;
          roomState = await getMeetingRoom(meetingId);
        }
        if (!active) return;
        if (roomState.status !== "OPEN") throw new Error("A sala desta reunião está encerrada.");
        const lifecycle = await getMeetingLifecycle(meetingId);
        setMeetingStatus(String(lifecycle.meeting?.status ?? "PLANNED"));

        const realtime = await createMeetingRealtime(meetingId);
        if (!active) { await realtime.unsubscribe(); return; }
        realtimeRef.current = realtime;

        const media = await getMeetingMediaJoinConfig(meetingId);
        let meetingSession: MeetingSession;
        if (media.mode === "SFU") {
          const updateTrack = (peerId: string, track: MediaStreamTrack, source: Track.Source, subscribed: boolean) => {
            const isScreen = source === Track.Source.ScreenShare || source === Track.Source.ScreenShareAudio;
            const setter = isScreen ? setRemoteScreenStreams : setRemoteStreams;
            setter((current) => {
              const nextStream = current[peerId] ?? new MediaStream();
              if (subscribed) {
                if (!nextStream.getTracks().some((item) => item.id === track.id)) nextStream.addTrack(track);
              } else {
                nextStream.removeTrack(track);
              }
              const next = { ...current };
              if (nextStream.getTracks().length) next[peerId] = nextStream;
              else delete next[peerId];
              return next;
            });
          };
          const livekit = new LiveKitMeetingSession({
            onRemoteTrack: updateTrack,
            onPeerLeft: (peerId) => {
              setRemoteStreams((current) => { const next = { ...current }; delete next[peerId]; return next; });
              setRemoteScreenStreams((current) => { const next = { ...current }; delete next[peerId]; return next; });
            },
            onLocalScreenShareChange: (enabled) => {
              setSharing(enabled);
              void realtimeRef.current?.trackPresence({
                userId: authSession.user.id,
                mic: micState.current,
                camera: cameraState.current,
                sharing: enabled,
              });
              void setSelfMeetingControl(meetingId, { screen_sharing: enabled }).catch(() => {});
            },
            onConnectionStateChange: (state) => setStatus(`Ligação: ${state}`),
          });
          if (!media.joinUrl || !media.token) throw new Error("Configuração SFU incompleta.");
          await livekit.connect(media.joinUrl, media.token);
          meetingSession = livekit;
        } else {
          const ice = await getMeetingIceConfig(meetingId);
          const rtc = new WebRtcSession({
            channel: realtime.channel,
            peerId: authSession.user.id,
            iceServers: ice.iceServers,
            onRemoteStream: (peerId, stream) => setRemoteStreams((current) => ({ ...current, [peerId]: stream })),
            onPeerLeft: (peerId) => setRemoteStreams((current) => {
              const next = { ...current }; delete next[peerId]; return next;
            }),
            onConnectionStateChange: (_peerId, state) => setStatus(`Ligação: ${state}`),
            onLocalScreenShareChange: (enabled) => {
              setSharing(enabled);
              void realtimeRef.current?.trackPresence({
                userId: authSession.user.id,
                mic: micState.current,
                camera: cameraState.current,
                sharing: enabled,
              });
              void setSelfMeetingControl(meetingId, { screen_sharing: enabled }).catch(() => {});
            },
            onScreenShareChange: (peerId, enabled) => {
              setRemoteScreenSharing((current) => ({ ...current, [peerId]: enabled }));
              setStatus(enabled ? `Participante ${peerId.slice(0, 8)} está a partilhar o ecrã` : "Partilha de ecrã terminada");
            },
          });
          meetingSession = rtc;
          const connectPeers = async () => {
            const states = realtime.channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
            const peerIds = Object.values(states).flat().map((state) => String(state.userId ?? ""))
              .filter((id) => id && id !== authSession.user.id);
            for (const peerId of new Set(peerIds)) {
              if (authSession.user.id < peerId) await rtc.connectToPeer(peerId, true);
            }
          };
          realtime.channel.on("presence", { event: "sync" }, () => void connectPeers());
          realtime.channel.on("presence", { event: "join" }, () => void connectPeers());
          await connectPeers();
        }
        sessionRef.current = meetingSession;

        await meetingSession.startLocalMedia();
        await meetingSession.setAudioEnabled(false);
        await meetingSession.setVideoEnabled(false);
        setMic(false);
        setCamera(false);
        if (localVideo.current) localVideo.current.srcObject = meetingSession.getLocalStream();

        await realtime.trackPresence({ userId: authSession.user.id, mic: false, camera: false, sharing: false });
        await setSelfMeetingControl(meetingId, { mic_muted: true, camera_enabled: false });
        setConnected(true);
        setStatus(media.mode === "SFU" ? "Sala de espera ligada via ZION SFU" : "Sala de espera ligada");

        const syncControls = async () => {
          const controls = await getMeetingControls(meetingId);
          const mine = controls.find((control) => control.user_id === authSession.user.id);
          if (!mine || !sessionRef.current) return;
          if (mine.removed) {
            setError("Você foi removido desta reunião.");
            await sessionRef.current.close();
            return;
          }
          await sessionRef.current.setAudioEnabled(!mine.mic_muted);
          await sessionRef.current.setVideoEnabled(mine.camera_enabled);
          setMic(!mine.mic_muted);
          setCamera(mine.camera_enabled);
          if (localVideo.current) localVideo.current.srcObject = sessionRef.current.getLocalStream();
        };
        await syncControls();
        controlsTimer = window.setInterval(() => { void syncControls(); }, 2000);
        lifecycleTimer = window.setInterval(() => {
          void getMeetingLifecycle(meetingId).then((value) => {
            const nextStatus = String(value.meeting?.status ?? "PLANNED");
            setMeetingStatus(nextStatus);
            if (nextStatus === "ENDED" && !endedHandled.current) {
              endedHandled.current = true;
              setConnected(false);
              void sessionRef.current?.close();
            }
          }).catch(() => {});
        }, 8000);
      } catch (cause) {
        if (!active) return;
        setConnected(false);
        setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a reunião.");
        setStatus("Falha ao ligar");
      }
    }
    void start();
    return () => {
      active = false;
      if (controlsTimer !== undefined) window.clearInterval(controlsTimer);
      if (lifecycleTimer !== undefined) window.clearInterval(lifecycleTimer);
      void sessionRef.current?.close();
      sessionRef.current = null;
      void realtimeRef.current?.unsubscribe();
      realtimeRef.current = null;
    };
  }, [meetingId, supabase]);

  async function toggleMic() {
    if (mediaBroadcasting) { setError("Termine a transmissão do conteúdo antes de ativar o microfone."); return; }
    const next = !mic;
    try {
      await sessionRef.current?.setAudioEnabled(next);
      if (localVideo.current && sessionRef.current) localVideo.current.srcObject = sessionRef.current.getLocalStream();
      setMic(next);
      void realtimeRef.current?.trackPresence({ mic: next, camera, sharing });
      void setSelfMeetingControl(meetingId, { mic_muted: !next }).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao guardar o microfone."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ativar o microfone.");
    }
  }

  async function toggleCamera() {
    if (mediaBroadcasting) { setError("Termine a transmissão do conteúdo antes de ativar a câmara."); return; }
    const next = !camera;
    try {
      await sessionRef.current?.setVideoEnabled(next);
      if (localVideo.current && sessionRef.current) localVideo.current.srcObject = sessionRef.current.getLocalStream();
      setCamera(next);
      void realtimeRef.current?.trackPresence({ mic, camera: next, sharing });
      void setSelfMeetingControl(meetingId, { camera_enabled: next }).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao guardar a câmara."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ativar a câmara.");
    }
  }

  async function toggleScreenShare() {
    if (mediaBroadcasting) {
      setError("Pare primeiro a transmissão do leitor antes de iniciar outra partilha.");
      return;
    }
    try {
      if (sharing) {
        await sessionRef.current?.stopScreenShare();
        setSharing(false);
        void realtimeRef.current?.trackPresence({ mic, camera, sharing: false });
        void setSelfMeetingControl(meetingId, { screen_sharing: false });
      } else {
        await sessionRef.current?.startScreenShare();
        setSharing(true);
        void realtimeRef.current?.trackPresence({ userId: currentUserId ?? "", mic, camera, sharing: true });
        void setSelfMeetingControl(meetingId, { screen_sharing: true });
        setMeetingNotice("Partilha iniciada. Para incluir o som de um vídeo, selecione um separador do navegador e ative a opção de partilha de áudio, quando disponível.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível partilhar o ecrã.");
    }
  }

  function handleMediaFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setError("Escolha um ficheiro de áudio ou vídeo suportado.");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError("O ficheiro excede o limite local de 200 MB.");
      return;
    }
    if (mediaBroadcasting) {
      setError("Pare a transmissão atual antes de trocar o ficheiro.");
      return;
    }
    if (mediaObjectUrl.current) URL.revokeObjectURL(mediaObjectUrl.current);
    const url = URL.createObjectURL(file);
    mediaObjectUrl.current = url;
    setMediaUrl(url);
    setMediaFileType(file.type.startsWith("video/") ? "video" : "audio");
    setMediaFileName(file.name);
    setError(null);
  }

  async function toggleMediaBroadcast() {
    if (!isModerator || !sessionRef.current || meetingStatus === "ENDED") return;
    if (!mediaBroadcasting && sharing) {
      setError("Termine primeiro a partilha de ecrã.");
      return;
    }
    if (mediaBroadcasting) {
      setMediaBusy(true);
      try {
        await sessionRef.current.stopMediaBroadcast();
        setMediaBroadcasting(false);
        setMeetingNotice("A reprodução partilhada foi terminada.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível terminar a transmissão.");
      } finally {
        setMediaBusy(false);
      }
      return;
    }
    const element = mediaVideo.current ?? mediaAudio.current;
    if (!element) return;
    setMediaBusy(true);
    setError(null);
    try {
      await sessionRef.current.startMediaBroadcast(element);
      setMediaBroadcasting(true);
      setMeetingNotice("Conteúdo a ser transmitido em direto para os participantes. A reprodução e a pausa são controladas pelo anfitrião.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível transmitir o conteúdo.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function beginOfficialMeeting() {
    if (!isModerator || meetingActionBusy) return;
    setMeetingActionBusy(true);
    setError(null);
    try {
      const meeting = await startMeeting(meetingId);
      setMeetingStatus(String(meeting.status ?? "LIVE"));
      setMeetingNotice("A reunião foi iniciada oficialmente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a reunião.");
    } finally {
      setMeetingActionBusy(false);
    }
  }

  async function finishOfficialMeeting() {
    if (!isModerator || meetingActionBusy) return;
    setMeetingActionBusy(true);
    setError(null);
    try {
      if (mediaBroadcasting) {
        await sessionRef.current?.stopMediaBroadcast();
        setMediaBroadcasting(false);
      }
      const meeting = await endMeeting(meetingId);
      setMeetingStatus(String(meeting.status ?? "ENDED"));
      endedHandled.current = true;
      await sessionRef.current?.close();
      setConnected(false);
      setMeetingNotice("A reunião foi encerrada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível encerrar a reunião.");
    } finally {
      setMeetingActionBusy(false);
    }
  }

  useEffect(() => () => {
    if (mediaObjectUrl.current) URL.revokeObjectURL(mediaObjectUrl.current);
  }, []);

  return (
    <main className="min-h-[calc(100vh-120px)] bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">ZION Institutional Meeting</p>
            <h1 className="mt-1 text-2xl font-semibold">Sala de reunião</h1>
            <p className="mt-1 text-sm text-slate-400">{status}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
              {Object.keys(remoteStreams).length + Object.keys(remoteScreenStreams).length + 1} participante(s)
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-100">
              {meetingStatus === "LIVE" ? "Reunião em curso" : meetingStatus === "ENDED" ? "Reunião encerrada" : "Sala de espera"}
            </span>
            {isModerator && meetingStatus !== "LIVE" && meetingStatus !== "ENDED" && (
              <button type="button" onClick={() => void beginOfficialMeeting()} disabled={meetingActionBusy} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">
                {meetingActionBusy ? "A iniciar…" : "Iniciar reunião"}
              </button>
            )}
            {isModerator && meetingStatus === "LIVE" && (
              <button type="button" onClick={() => void finishOfficialMeeting()} disabled={meetingActionBusy} className="rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 disabled:opacity-40">
                {meetingActionBusy ? "A encerrar…" : "Encerrar reunião"}
              </button>
            )}
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {meetingNotice && <div role="status" className="rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">{meetingNotice}</div>}
        {meetingStatus !== "LIVE" && meetingStatus !== "ENDED" && <div className="rounded-xl border border-amber-200/15 bg-amber-200/[0.06] px-4 py-3 text-sm text-amber-100">Sala de espera aberta. O anfitrião pode partilhar conteúdos enquanto os participantes aguardam o início oficial.</div>}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs">Você</span>
            {sharing && <span className="absolute right-3 top-3 rounded-lg bg-indigo-500/80 px-2.5 py-1 text-xs">A partilhar apresentação/ecrã</span>}
          </div>
          {Object.entries(remoteScreenStreams).map(([peerId, stream]) => (
            <RemoteVideo key={peerId + "-screen"} peerId={peerId} stream={stream} label="Apresentação partilhada" presentation />
          ))}
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <RemoteVideo key={peerId} peerId={peerId} stream={stream} label={remoteScreenSharing[peerId] ? "A partilhar ecrã" : undefined} onRef={(node) => {
              if (node) { node.srcObject = stream; remoteVideos.current.set(peerId, node); }
              else remoteVideos.current.delete(peerId);
            }} />
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <button onClick={toggleMic} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm hover:bg-white/15">
            {mic ? "Microfone ligado" : "Microfone desligado"}
          </button>
          <button onClick={toggleCamera} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm hover:bg-white/15">
            {camera ? "Câmara ligada" : "Câmara desligada"}
          </button>
          <button onClick={() => void toggleScreenShare()} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm hover:bg-white/15">
            {sharing ? "Parar partilha" : "Partilhar apresentação/ecrã"}
          </button>
        </div>

        <section className="rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.06] p-4">
          <h2 className="text-sm font-semibold text-indigo-100">Apresentações e conteúdos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Para apresentar PowerPoint, PDF, Google Slides ou Canva, abre o conteúdo noutra janela ou separador,
            inicia a apresentação e escolhe essa janela/separador no seletor de partilha do navegador.
            Quando disponível, ativa também a partilha de áudio do separador para incluir vídeos e som.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A disponibilidade da partilha de ecrã e do áudio depende do navegador, do sistema operativo e das permissões do dispositivo.
            Em telemóveis, algumas opções podem não estar disponíveis; para apresentações longas, recomenda-se computador.
          </p>
        </section>

        <section className="rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-indigo-100">Conteúdo para a sala de espera</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">O anfitrião pode reproduzir música ou vídeo. O conteúdo é publicado como áudio/vídeo da reunião; os participantes recebem a transmissão, não apenas o som local do anfitrião. Reproduzir e pausar no leitor controla a transmissão em direto.</p>
            </div>
            {mediaBroadcasting && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">A transmitir</span>}
          </div>
          {isModerator ? (
            <div className="mt-3 space-y-3">
              <input type="file" accept="audio/*,video/*" onChange={handleMediaFileChange} disabled={mediaBroadcasting || mediaBusy} aria-label="Escolher música ou vídeo para a sala de espera" className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white disabled:opacity-50" />
              {mediaFileName && <p className="truncate text-xs text-sky-100" title={mediaFileName}>{mediaFileName}</p>}
              {mediaUrl && mediaFileType === "video" && <video ref={mediaVideo} src={mediaUrl} controls playsInline onEnded={() => { if (mediaBroadcasting) void toggleMediaBroadcast(); }} className="max-h-64 w-full rounded-xl bg-black" />}
              {mediaUrl && mediaFileType === "audio" && <audio ref={mediaAudio} src={mediaUrl} controls onEnded={() => { if (mediaBroadcasting) void toggleMediaBroadcast(); }} className="w-full" />}
              <button type="button" onClick={() => void toggleMediaBroadcast()} disabled={!connected || !mediaUrl || mediaBusy || meetingStatus === "ENDED" || sharing} className={"w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 " + (mediaBroadcasting ? "bg-rose-500/20 text-rose-100" : "bg-indigo-300 text-slate-950")}>
                {mediaBusy ? "A preparar transmissão…" : mediaBroadcasting ? "Parar transmissão do conteúdo" : "Transmitir música/vídeo aos participantes"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">O conteúdo multimédia partilhado pelo anfitrião aparecerá na área de apresentações. O teu microfone e a câmara começam desligados.</p>
          )}
        </section>

        {isModerator && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Controlo do moderador</h2>
              <span className="text-xs text-slate-400">{participants.length} participante(s)</span>
            </div>
            <div className="space-y-2">
              {participants.filter((p) => p.user_id !== currentUserId).map((participant) => (
                <div key={participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <div>
                    <p className="text-sm">{participant.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-500">{participant.participant_role} · {participant.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => void moderateMeetingParticipant(meetingId, participant.user_id, { mic_muted: true }).then(() => setStatus("Microfone do participante silenciado")).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao moderar."))} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Silenciar</button>
                    <button onClick={() => void moderateMeetingParticipant(meetingId, participant.user_id, { camera_enabled: false }).then(() => setStatus("Câmara do participante desligada")).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao moderar."))} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Desligar câmara</button>
                    <button onClick={() => void moderateMeetingParticipant(meetingId, participant.user_id, { removed: true }).then(() => setStatus("Participante removido")).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao moderar."))} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function RemoteVideo({ peerId, stream, onRef, label, presentation = false }: { peerId: string; stream: MediaStream; onRef?: (node: HTMLVideoElement | null) => void; label?: string; presentation?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsPlayback, setNeedsPlayback] = useState(false);
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().then(() => setNeedsPlayback(false)).catch(() => setNeedsPlayback(true));
  }, [stream]);
  return (
    <div className={"relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 " + (presentation ? "col-span-full aspect-video xl:col-span-2" : "aspect-video")}>
      <video ref={(node) => { videoRef.current = node; onRef?.(node); }} autoPlay playsInline className={"h-full w-full " + (presentation ? "object-contain" : "object-cover")} />
      <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2.5 py-1 text-xs">{label || ("Participante " + peerId.slice(0, 8))}</span>
      {needsPlayback && <button type="button" onClick={() => {
        void videoRef.current?.play().then(() => setNeedsPlayback(false)).catch(() => setNeedsPlayback(true));
      }} className="absolute right-3 top-3 rounded-lg bg-black/75 px-3 py-2 text-xs font-semibold text-white">Ativar áudio/vídeo</button>}
    </div>
  );
}
