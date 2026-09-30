"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMeetingRealtime } from "@/lib/governance/meeting-realtime";
import { getMeetingIceConfig } from "@/lib/governance/ice";
import { WebRtcSession } from "@/lib/governance/webrtc-session";

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

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Sessão de autenticação não encontrada.");

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
  }

  function toggleCamera() {
    const next = !camera;
    sessionRef.current?.setVideoEnabled(next);
    setCamera(next);
    void realtimeRef.current?.trackPresence({ mic, camera: next, sharing });
  }

  async function toggleScreenShare() {
    try {
      if (sharing) {
        await sessionRef.current?.stopScreenShare();
        setSharing(false);
        void realtimeRef.current?.trackPresence({ mic, camera, sharing: false });
      } else {
        await sessionRef.current?.startScreenShare();
        setSharing(true);
        void realtimeRef.current?.trackPresence({ mic, camera, sharing: true });
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
