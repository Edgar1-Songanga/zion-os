"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type CallKind = "audio" | "video";
type CallRow = { id: string; conversation_id: string; initiator_id: string; kind: CallKind; status: string };
type JoinConfig = { mode: string; provider: string; roomId: string; joinUrl: string; token?: string };

export default function ResaCallControls({ conversationId }: { conversationId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [call, setCall] = useState<CallRow | null>(null);
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteMedia = useRef<HTMLDivElement | null>(null);
  const userId = useRef<string | null>(null);
  const callRef = useRef<CallRow | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError || !data.user?.id) setError("Entre na sua conta ZION para fazer chamadas.");
      userId.current = data.user?.id ?? null;
      setReady(true);
    });
    return () => { mounted = false; };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel("resa-call-events-" + conversationId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resa_calls", filter: "conversation_id=eq." + conversationId }, (payload) => {
        const next = payload.new as CallRow;
        if (next.initiator_id !== userId.current && next.status === "ringing" && !callRef.current) setIncoming(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resa_calls", filter: "conversation_id=eq." + conversationId }, (payload) => {
        const next = payload.new as CallRow;
        if (callRef.current?.id === next.id && ["ended", "declined", "missed"].includes(next.status)) {
          void roomRef.current?.disconnect(true);
          roomRef.current = null;
          callRef.current = null;
          setCall(null); setActive(false); setConnected(false);
        }
        if (incoming?.id === next.id && ["ended", "declined", "missed"].includes(next.status)) setIncoming(null);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, incoming?.id, supabase]);

  async function otherMembers() {
    if (!userId.current) throw new Error("Sessão ZION não encontrada.");
    const { data, error: queryError } = await supabase.from("resa_conversation_members").select("user_id").eq("conversation_id", conversationId);
    if (queryError) throw queryError;
    return (data ?? []).map((row) => row.user_id).filter((id) => id !== userId.current);
  }

  async function joinMedia(callRow: CallRow, kind: CallKind) {
    const config = await resaRequest<JoinConfig>("/v1/resa/calls/" + callRow.id + "/join", { method: "POST" });
    if (config.mode !== "SFU" || !config.token || !config.joinUrl) {
      throw new Error("O servidor de mídia LiveKit/SFU não está configurado para chamadas. Contacte o administrador ZION.");
    }
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    room.on(RoomEvent.Connected, () => setConnected(true));
    room.on(RoomEvent.Disconnected, () => setConnected(false));
    room.on(RoomEvent.TrackSubscribed, (track) => {
      const element = track.attach();
      element.autoplay = true;
      if (track.kind === Track.Kind.Video) {
        element.className = "h-full w-full rounded-2xl bg-black object-cover";
        remoteMedia.current?.appendChild(element);
      } else {
        element.className = "sr-only";
        remoteMedia.current?.appendChild(element);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((element) => element.remove()));
    try {
      await room.connect(config.joinUrl, config.token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      if (kind === "video") await room.localParticipant.setCameraEnabled(true);
      setMuted(false); setCamera(kind === "video");
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (publication?.track && localVideo.current) {
        localVideo.current.srcObject = new MediaStream([publication.track.mediaStreamTrack]);
        await localVideo.current.play().catch(() => undefined);
      }
      return room;
    } catch (joinError) {
      await room.disconnect(true);
      roomRef.current = null;
      throw joinError;
    }
  }

  async function start(kind: CallKind) {
    let created: CallRow | null = null;
    try {
      setError(null);
      if (!ready || !userId.current) throw new Error("A sessão de utilizador ainda não está pronta.");
      const others = await otherMembers();
      if (!others[0]) throw new Error("Esta conversa ainda não tem outro participante disponível.");
      const { data, error: insertError } = await supabase.from("resa_calls")
        .insert({ conversation_id: conversationId, initiator_id: userId.current, kind, status: "ringing" })
        .select("id,conversation_id,initiator_id,kind,status").single();
      if (insertError) throw insertError;
      created = data as CallRow;
      callRef.current = created; setCall(created);
      const { error: participantError } = await supabase.from("resa_call_participants")
        .upsert({ call_id: created.id, user_id: userId.current, status: "joined", joined_at: new Date().toISOString() }, { onConflict: "call_id,user_id" });
      if (participantError) throw participantError;
      await joinMedia(created, kind);
      setActive(true);
    } catch (reason) {
      if (created) {
        await supabase.from("resa_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", created.id);
        callRef.current = null; setCall(null);
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a chamada.");
    }
  }

  async function accept() {
    const target = incoming;
    if (!target) return;
    try {
      setError(null);
      callRef.current = target; setCall(target);
      await joinMedia(target, target.kind);
      if (!userId.current) throw new Error("Sessão ZION não encontrada.");
      const { error: participantError } = await supabase.from("resa_call_participants")
        .upsert({ call_id: target.id, user_id: userId.current, status: "joined", joined_at: new Date().toISOString() }, { onConflict: "call_id,user_id" });
      if (participantError) throw participantError;
      const { error: updateError } = await supabase.from("resa_calls")
        .update({ status: "active", answered_at: new Date().toISOString() }).eq("id", target.id);
      if (updateError) throw updateError;
      setIncoming(null); setActive(true);
    } catch (reason) {
      await roomRef.current?.disconnect(true); roomRef.current = null;
      callRef.current = null; setCall(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível atender a chamada.");
    }
  }

  async function decline() {
    if (!incoming) return;
    const target = incoming;
    setIncoming(null);
    const { error: updateError } = await supabase.from("resa_calls")
      .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", target.id);
    if (updateError) setError(updateError.message);
  }

  async function end() {
    const id = callRef.current?.id;
    await roomRef.current?.disconnect(true);
    roomRef.current = null; callRef.current = null;
    setCall(null); setActive(false); setConnected(false);
    if (id) {
      const { error: updateError } = await supabase.from("resa_calls")
        .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
      if (updateError) setError(updateError.message);
    }
  }

  async function toggleMute() {
    const next = !muted;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  async function toggleCamera() {
    const next = !camera;
    await roomRef.current?.localParticipant.setCameraEnabled(next);
    setCamera(next);
  }

  async function startAudio() {
    try { await roomRef.current?.startAudio(); } catch { setError("Toque em Ativar áudio para permitir reprodução no navegador."); }
  }

  return <div className="flex items-center gap-2">
    <button disabled={!ready || active} onClick={() => void start("audio")} aria-label="Iniciar chamada de áudio" title="Chamada de áudio" className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0C1A3D] shadow-sm transition hover:bg-slate-50 disabled:opacity-40"><span aria-hidden="true">☎</span><span className="hidden sm:inline">Áudio</span></button>
    <button disabled={!ready || active} onClick={() => void start("video")} aria-label="Iniciar videochamada" title="Videochamada" className="flex h-10 items-center gap-2 rounded-xl bg-[#0C1A3D] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#122858] disabled:opacity-40"><span aria-hidden="true">▣</span><span className="hidden sm:inline">Vídeo</span></button>
    {error&&<span role="alert" className="max-w-[240px] text-xs text-red-600">{error}</span>}
    {incoming&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#061127]/60 p-4 backdrop-blur-md"><div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Chamada recebida</p><h3 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{incoming.kind === "video" ? "Videochamada" : "Chamada de áudio"}</h3><div className="mt-6 flex gap-3"><button onClick={() => void decline()} className="flex-1 rounded-2xl border px-4 py-3 font-semibold">Recusar</button><button onClick={() => void accept()} className="flex-1 rounded-2xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white">Atender</button></div></div></div>}
    {active&&<div className="fixed inset-0 z-[60] bg-[#020817]/95 p-3 backdrop-blur-md sm:p-5"><div className="mx-auto flex h-full max-w-6xl flex-col"><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · chamada segura</p><p className="mt-1 font-semibold">{connected ? "Ligado" : "A ligar…"} · {call?.kind === "video" ? "Vídeo" : "Áudio"}</p></div><button onClick={() => void end()} className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold shadow-lg hover:bg-red-500">Terminar</button></div><div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-slate-900"><div ref={remoteMedia} className="flex h-full w-full items-center justify-center gap-3 [&_video]:max-h-full [&_video]:max-w-full" />{call?.kind === "video"&&<video ref={localVideo} autoPlay muted playsInline className="absolute bottom-5 right-5 h-32 w-52 rounded-2xl border-2 border-white/20 bg-slate-900 object-cover shadow-2xl" />}{call?.kind === "audio"&&<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl text-white/80">☎</div>}</div><div className="mt-4 flex justify-center gap-3"><button onClick={() => void toggleMute()} aria-label={muted ? "Ativar microfone" : "Silenciar microfone"} className={"rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg " + (muted ? "bg-red-500/80" : "bg-white/10 hover:bg-white/15")}>{muted ? "Ativar microfone" : "Silenciar microfone"}</button>{call?.kind === "video"&&<button onClick={() => void toggleCamera()} aria-label={camera ? "Desligar câmara" : "Ligar câmara"} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-white/15">{camera ? "Desligar câmara" : "Ligar câmara"}</button>}<button onClick={() => void startAudio()} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-white/15">Ativar áudio</button></div></div></div>}
  </div>;
}
