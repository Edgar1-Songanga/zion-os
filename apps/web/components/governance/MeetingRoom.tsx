"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMeetingRealtime } from "@/lib/governance/meeting-realtime";
import { getMeetingIceConfig } from "@/lib/governance/ice";
import { WebRtcSession } from "@/lib/governance/webrtc-session";
import { getMeetingControls, getMeetingParticipants, moderateMeetingParticipant, setSelfMeetingControl, type MeetingParticipant } from "@/lib/governance/meeting-api";

type Props = { meetingId: string };

export default function MeetingRoom({ meetingId }: Props) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideos = useRef(new Map<string, HTMLVideoElement>());
  const sessionRef = useRef<WebRtcSession | null>(null);
  const realtimeRef = useRef<Awaited<ReturnType<typeof createMeetingRealtime>> | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("A preparar a sala…");
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Sessão de autenticação não encontrada.");

        setCurrentUserId(session.user.id);
        const participantRows = await getMeetingParticipants(meetingId);
        setParticipants(participantRows);
        setIsModerator(participantRows.some((p) => p.user_id === session.user.id && ["HOST", "MODERATOR"].includes(p.participant_role) && ["INVITED", "ACCEPTED", "PRESENT"].includes(p.status)));

        const realtime = await createMeetingRealtime(meetingId);
        if (!active) { await realtime.unsubscribe(); return; }
        realtimeRef.current = realtime;

        const ice = await getMeetingIceConfig(meetingId);
        const rtc = new WebRtcSession({
          channel: realtime.channel,
          peerId: session.user.id,
          iceServers: ice.iceServers,
          onRemoteStream: (peerId, stream) => setRemoteStreams((current) => ({ ...current, [peerId]: stream })),
          onPeerLeft: (peerId) => setRemoteStreams((current) => {
            const next = { ...current }; delete next[peerId]; return next;
          }),
          onConnectionStateChange: (_peerId, state) => setStatus(`Ligação: ${state}`),
          onScreenShareChange: (peerId, enabled) => {
            setStatus(enabled ? `Participante ${peerId.slice(0, 8)} está a partilhar o ecrã` : "Partilha de ecrã terminada");
          },
        });
        sessionRef.current = rtc;

        const local = await rtc.startLocalMedia();
        if (localVideo.current) localVideo.current.srcObject = local;

        await realtime.trackPresence({ userId: session.user.id, mic: true, camera: true, sharing: false });
        setStatus("Sala ligada");

        const connectPeers = async () => {
          const states = realtime.channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
          const peerIds = Object.values(states).flat().map((state) => String(state.userId ?? ""))
            .filter((id) => id && id !== session.user.id);
          for (const peerId of new Set(peerIds)) {
            if (session.user.id < peerId) await rtc.connectToPeer(peerId, true);
          }
        };

        realtime.channel.on("presence", { event: "sync" }, () => void connectPeers());
        realtime.channel.on("presence", { event: "join" }, () => void connectPeers());
        await connectPeers();

        const syncControls = async () => {
          const controls = await getMeetingControls(meetingId);
          const mine = controls.find((control) => control.user_id === session.user.id);
          if (!mine || !sessionRef.current) return;
          if (mine.removed) {
            setError("Você foi removido desta reunião.");
            await sessionRef.current.close();
            return;
          }
          sessionRef.current.setAudioEnabled(!mine.mic_muted);
          sessionRef.current.setVideoEnabled(mine.camera_enabled);
          setMic(!mine.mic_muted);
          setCamera(mine.camera_enabled);
        };
        await syncControls();
        const controlsTimer = window.setInterval(() => { void syncControls(); }, 2000);
        return () => window.clearInterval(controlsTimer);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a reunião.");
        setStatus("Falha ao ligar");
      }
    }
    void start();
    return () => {
      active = false;
      void sessionRef.current?.close();
      sessionRef.current = null;
      void realtimeRef.current?.unsubscribe();
      realtimeRef.current = null;
    };
  }, [meetingId, supabase]);

  function toggleMic() {
    const next = !mic;
    sessionRef.current?.setAudioEnabled(next);
    setMic(next);
    void realtimeRef.current?.trackPresence({ mic: next, camera, sharing });
    void setSelfMeetingControl(meetingId, { mic_muted: !next }).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao guardar o microfone."));
  }

  function toggleCamera() {
    const next = !camera;
    sessionRef.current?.setVideoEnabled(next);
    setCamera(next);
    void realtimeRef.current?.trackPresence({ mic, camera: next, sharing });
    void setSelfMeetingControl(meetingId, { camera_enabled: next }).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao guardar a câmara."));
  }

  async function toggleScreenShare() {
    try {
      if (sharing) {
        await sessionRef.current?.stopScreenShare();
        setSharing(false);
        void realtimeRef.current?.trackPresence({ mic, camera, sharing: false });
        void setSelfMeetingControl(meetingId, { screen_sharing: false });
      } else {
        await sessionRef.current?.startScreenShare();
        setSharing(true);
        void realtimeRef.current?.trackPresence({ mic, camera, sharing: true });
        void setSelfMeetingControl(meetingId, { screen_sharing: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível partilhar o ecrã.");
    }
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">ZION Institutional Meeting</p>
            <h1 className="mt-1 text-2xl font-semibold">Sala de reunião</h1>
            <p className="mt-1 text-sm text-slate-400">{status}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {Object.keys(remoteStreams).length + 1} participante(s)
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs">Você</span>
            {sharing && <span className="absolute right-3 top-3 rounded-lg bg-indigo-500/80 px-2.5 py-1 text-xs">A partilhar ecrã</span>}
          </div>
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <RemoteVideo key={peerId} peerId={peerId} stream={stream} onRef={(node) => {
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
            {sharing ? "Parar partilha" : "Partilhar ecrã"}
          </button>
        </div>

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
        )
      </div>
      </div>
    </main>
  );
}

function RemoteVideo({ peerId, stream, onRef }: { peerId: string; stream: MediaStream; onRef: (node: HTMLVideoElement | null) => void }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
      <video ref={onRef} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs">{peerId.slice(0, 8)}</span>
    </div>
  );
}
