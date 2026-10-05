"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { resaRequest } from "@/lib/resa/api";

type JoinConfig = { joinUrl: string; token: string; roomId: string };

export default function LiveStudio({ liveId, title, onClose }: { liveId: string; title: string; onClose: () => void }) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachLocal = () => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const track = publication?.track;
      if (track && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
        localVideoRef.current.play().catch(() => {});
      }
    };

    const attachRemote = (track: any, participant: any) => {
      if (!remoteRef.current || track.kind !== Track.Kind.Video) return;
      const video = track.attach();
      video.autoplay = true;
      video.playsInline = true;
      video.className = "h-full w-full object-cover";
      video.dataset.participant = participant.identity;
      remoteRef.current.appendChild(video);
    };

    room
      .on(RoomEvent.TrackSubscribed, attachRemote)
      .on(RoomEvent.TrackUnsubscribed, (track: any) => track.detach())
      .on(RoomEvent.ParticipantDisconnected, (participant: any) => {
        remoteRef.current?.querySelectorAll(`[data-participant="${participant.identity}"]`).forEach((node) => node.remove());
      })
      .on(RoomEvent.Connected, () => { if (mounted) setConnected(true); attachLocal(); })
      .on(RoomEvent.Disconnected, () => { if (mounted) setConnected(false); });

    void (async () => {
      try {
        const config = await resaRequest<JoinConfig>("/v1/resa/live/" + liveId + "/join", { method: "POST" });
        await room.connect(config.joinUrl, config.token, { autoSubscribe: true });
        await room.localParticipant.enableCameraAndMicrophone();
        attachLocal();
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Não foi possível iniciar o Studio Live.");
      } finally {
        if (mounted) setStarting(false);
      }
    })();

    return () => {
      mounted = false;
      void room.disconnect(true);
      roomRef.current = null;
    };
  }, [liveId]);

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room) return;
    const next = !camera;
    await room.localParticipant.setCameraEnabled(next);
    setCamera(next);
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room) return;
    const next = !microphone;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicrophone(next);
  }

  async function startAudio() {
    try { await roomRef.current?.startAudio(); } catch {}
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020817]/90 p-3 backdrop-blur-md sm:p-6">
      <div className="flex h-[min(900px,96vh)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#08152f] shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Live Studio</p>
            <h2 className="mt-1 font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{connected ? "Ligado à transmissão" : starting ? "A ligar câmera e microfone…" : "Desligado"}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Fechar Studio</button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_300px]">
          <div className="relative min-h-[360px] overflow-hidden rounded-[24px] bg-black">
            <div ref={remoteRef} className="h-full w-full" />
            <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-32 w-52 rounded-2xl border-2 border-white/20 bg-slate-900 object-cover shadow-2xl" />
            {!connected && !error && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">A preparar a transmissão…</div>}
          </div>

          <aside className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-white">
            <p className="text-sm font-semibold">Controlos</p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => void toggleMicrophone()} disabled={!connected} className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40">{microphone ? "🎙️ Microfone ligado" : "🔇 Microfone desligado"}</button>
              <button onClick={() => void toggleCamera()} disabled={!connected} className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40">{camera ? "📷 Câmara ligada" : "🚫 Câmara desligada"}</button>
              <button onClick={() => void startAudio()} disabled={!connected} className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold disabled:opacity-40">🔊 Ativar áudio</button>
            </div>
            {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-200">{error}</div>}
            <div className="mt-6 rounded-2xl bg-white/5 p-4 text-xs leading-5 text-slate-400">O Studio usa o motor de mídia LiveKit já presente no ZION. A câmera e o microfone só são ativados depois da autorização do navegador.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
