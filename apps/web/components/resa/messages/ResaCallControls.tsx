"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type CallKind = "audio" | "video";
type CallRow = { id: string; conversation_id: string; initiator_id: string; kind: CallKind; status: string };
type JoinConfig = { mode: string; provider: string; roomId: string; joinUrl: string; token?: string };

export default function ResaCallControls({ conversationId, peerName = "Membro RESA", peerAvatarUrl = null, autoStart = null, onAutoStartHandled }: { conversationId: string; peerName?: string; peerAvatarUrl?: string | null; autoStart?: CallKind | null; onAutoStartHandled?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [call, setCall] = useState<CallRow | null>(null);
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [active, setActive] = useState(false);
  const [callStatus, setCallStatus] = useState<"ringing" | "active">("ringing");
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [remoteScreenShare, setRemoteScreenShare] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callActionBusy, setCallActionBusy] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteMedia = useRef<HTMLDivElement | null>(null);
  const remoteScreenMedia = useRef<HTMLDivElement | null>(null);
  const userId = useRef<string | null>(null);
  const callRef = useRef<CallRow | null>(null);
  const callActionRef = useRef<"starting" | "accepting" | "declining" | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const callTimeoutRef = useRef<number | null>(null);
  const autoStartConversationRef = useRef<string | null>(null);
  const startCallRef = useRef<(kind: CallKind) => void>(() => undefined);
  const onAutoStartHandledRef = useRef(onAutoStartHandled);
  onAutoStartHandledRef.current = onAutoStartHandled;

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
    if (!ready || !autoStart || autoStartConversationRef.current === conversationId) return;
    autoStartConversationRef.current = conversationId;
    startCallRef.current(autoStart);
    onAutoStartHandledRef.current?.();
  }, [ready, autoStart, conversationId]);

  useEffect(() => {
    const channel = supabase.channel("resa-call-events-" + conversationId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resa_calls", filter: "conversation_id=eq." + conversationId }, (payload) => {
        const next = payload.new as CallRow;
        if (next.initiator_id !== userId.current && next.status === "ringing" && !callRef.current) setIncoming(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resa_calls", filter: "conversation_id=eq." + conversationId }, (payload) => {
        const next = payload.new as CallRow;
        if (callRef.current?.id === next.id && next.status === "active") setCallStatus("active");
        if (callRef.current?.id === next.id && next.status !== "ringing" && callTimeoutRef.current !== null) {
          window.clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        if (callRef.current?.id === next.id && ["ended", "declined", "missed"].includes(next.status)) {
          if (next.status === "missed") setError("A chamada não foi atendida. Pode tentar novamente.");
          void roomRef.current?.disconnect(true);
          roomRef.current = null;
          callRef.current = null;
          setCall(null); setActive(false); setCallStatus("ringing"); setConnected(false); setReconnecting(false); setScreenShare(false);
        }
        if (incoming?.id === next.id && ["ended", "declined", "missed"].includes(next.status)) setIncoming(null);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, incoming?.id, supabase]);

  useEffect(() => {
    if (!incoming) return;
    let active = true;
    let stopAlert: () => void = () => undefined;
    void resaRequest<NotificationAlertPreferences>("/v1/notifications/preferences")
      .catch(() => ({} as NotificationAlertPreferences))
      .then((preferences) => {
        if (active) stopAlert = playNotificationAlert("resa.call.incoming", preferences);
      });
    return () => {
      active = false;
      stopAlert();
    };
  }, [incoming?.id]);

  useEffect(() => {
    return () => {
      const activeCallId = callRef.current?.id;
      const room = roomRef.current;
      roomRef.current = null;
      callRef.current = null;
      intentionalDisconnectRef.current = true;
      if (callTimeoutRef.current !== null) window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
      void room?.disconnect(true);
      if (activeCallId) {
        void supabase.from("resa_calls")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", activeCallId);
      }
    };
  }, [supabase]);

  useEffect(() => {
    if (!active || call?.kind !== "video" || !camera) {
      if (localVideo.current) {
        localVideo.current.pause();
        localVideo.current.srcObject = null;
      }
      return;
    }
    const video = localVideo.current;
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!video || !track) return;
    video.srcObject = new MediaStream([track.mediaStreamTrack]);
    void video.play().catch(() => setError("A câmara foi ligada, mas a pré-visualização não iniciou. Verifique a permissão de câmara do navegador."));
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [active, camera, call?.id, call?.kind, connected]);

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
    room.on(RoomEvent.Connected, () => { setConnected(true); setReconnecting(false); setConnectionFailed(false); });
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) setScreenShare(true);
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) setScreenShare(false);
    });
    room.on(RoomEvent.Reconnecting, () => { setConnected(false); setReconnecting(true); setConnectionFailed(false); });
    room.on(RoomEvent.Reconnected, () => { setConnected(true); setReconnecting(false); setConnectionFailed(false); setError(null); });
    room.on(RoomEvent.Disconnected, () => {
      setConnected(false); setReconnecting(false);
      if (!intentionalDisconnectRef.current && callRef.current) {
        setConnectionFailed(true);
        setError("A ligação foi interrompida. Termine a chamada antes de iniciar outra.");
      }
    });
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      const element = track.attach();
      element.autoplay = true;
      const participantName = participant.name || participant.identity || "Participante";
      const isRemoteScreen = track.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video;
      if (isRemoteScreen) {
        const tile = document.createElement("div");
        tile.className = "relative h-full w-full bg-black";
        tile.dataset.participant = participant.identity;
        element.className = "h-full w-full bg-black object-contain";
        element.setAttribute("aria-label", "Ecrã partilhado por " + participantName);
        tile.appendChild(element);
        const label = document.createElement("div");
        label.className = "absolute left-3 top-3 z-10 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur";
        label.textContent = participantName + " · Ecrã partilhado";
        tile.appendChild(label);
        remoteScreenMedia.current?.appendChild(tile);
        setRemoteScreenShare(true);
      } else if (track.kind === Track.Kind.Video) {
        element.className = "h-full w-full rounded-2xl bg-black object-cover";
        element.dataset.participant = participant.identity;
        remoteMedia.current?.appendChild(element);
      } else {
        element.className = "sr-only";
        element.dataset.participant = participant.identity;
        remoteMedia.current?.appendChild(element);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      const isRemoteScreen = track.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video;
      if (isRemoteScreen) {
        const tiles = Array.from(remoteScreenMedia.current?.children ?? []);
        tiles.filter((node) => (node as HTMLElement).dataset.participant === participant.identity)
          .forEach((node) => node.remove());
        setRemoteScreenShare(false);
      } else {
        track.detach().forEach((element) => element.remove());
      }
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      [remoteMedia.current, remoteScreenMedia.current].forEach((container) => {
        const nodes = Array.from(container?.querySelectorAll("[data-participant]") ?? []);
        nodes.filter((node) => (node as HTMLElement).dataset.participant === participant.identity)
          .forEach((node) => node.remove());
      });
      if (!remoteScreenMedia.current?.children.length) setRemoteScreenShare(false);
    });
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
      intentionalDisconnectRef.current = true;
      await room.disconnect(true);
      intentionalDisconnectRef.current = false;
      roomRef.current = null;
      throw joinError;
    }
  }

  async function start(kind: CallKind) {
    if (callActionRef.current || callRef.current) return;
    callActionRef.current = "starting";
    setCallActionBusy(true);
    let created: CallRow | null = null;
    try {
      setError(null); setConnectionFailed(false);
      if (!ready || !userId.current) throw new Error("A sessão de utilizador ainda não está pronta.");
      const others = await otherMembers();
      if (!others[0]) throw new Error("Esta conversa ainda não tem outro participante disponível.");
      const { data, error: insertError } = await supabase.from("resa_calls")
        .insert({ conversation_id: conversationId, initiator_id: userId.current, kind, status: "ringing" })
        .select("id,conversation_id,initiator_id,kind,status").single();
      if (insertError) throw insertError;
      created = data as CallRow;
      callRef.current = created; setCall(created); setCallStatus("ringing");
      // Start the 45-second unanswered-call window at creation, not after media setup.
      callTimeoutRef.current = window.setTimeout(() => {
        callTimeoutRef.current = null;
        void (async () => {
          const { data: expired, error: expiryError } = await supabase.from("resa_calls")
            .update({ status: "missed", ended_at: new Date().toISOString() })
            .eq("id", created!.id).eq("status", "ringing")
            .select("id").maybeSingle();
          if (expiryError) {
            setError("Não foi possível finalizar automaticamente a chamada não atendida. Termine-a manualmente.");
            return;
          }
          if (expired && callRef.current?.id === created!.id) {
            intentionalDisconnectRef.current = true;
            await roomRef.current?.disconnect(true);
            roomRef.current = null;
            intentionalDisconnectRef.current = false;
            callRef.current = null;
            setCall(null); setActive(false); setConnected(false); setReconnecting(false);
            setError("A chamada não foi atendida. Pode tentar novamente.");
          }
        })();
      }, 45_000);
      const { error: participantError } = await supabase.from("resa_call_participants")
        .upsert({ call_id: created.id, user_id: userId.current, status: "joined", joined_at: new Date().toISOString() }, { onConflict: "call_id,user_id" });
      if (participantError) throw participantError;
      await joinMedia(created, kind);
      // A delayed media connection must not resurrect a call already expired or ended.
      const { data: latestCall, error: statusError } = await supabase.from("resa_calls")
        .select("status").eq("id", created.id).maybeSingle();
      if (statusError) throw statusError;
      if (!latestCall || ["missed", "ended", "declined"].includes(latestCall.status)) {
        intentionalDisconnectRef.current = true;
        await roomRef.current?.disconnect(true);
        roomRef.current = null;
        intentionalDisconnectRef.current = false;
        callRef.current = null;
        setCall(null); setActive(false); setConnected(false); setReconnecting(false);
        setError("A chamada expirou antes de a ligação ficar pronta. Pode tentar novamente.");
        return;
      }
      setActive(true);
    } catch (reason) {
      if (created) {
        if (callTimeoutRef.current !== null) window.clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
        await supabase.from("resa_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", created.id);
        callRef.current = null; setCall(null);
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a chamada.");
    } finally {
      callActionRef.current = null;
      setCallActionBusy(false);
    }
  }

  startCallRef.current = (kind) => { void start(kind); };

  async function accept() {
    const target = incoming;
    if (!target || callActionRef.current || callRef.current) return;
    callActionRef.current = "accepting";
    setCallActionBusy(true);
    try {
      setError(null); setConnectionFailed(false);
      callRef.current = target; setCall(target);
      await joinMedia(target, target.kind);
      if (!userId.current) throw new Error("Sessão ZION não encontrada.");
      const { error: participantError } = await supabase.from("resa_call_participants")
        .upsert({ call_id: target.id, user_id: userId.current, status: "joined", joined_at: new Date().toISOString() }, { onConflict: "call_id,user_id" });
      if (participantError) throw participantError;
      const { error: updateError } = await supabase.from("resa_calls")
        .update({ status: "active", answered_at: new Date().toISOString() }).eq("id", target.id);
      if (updateError) throw updateError;
      setIncoming(null); setCallStatus("active"); setActive(true);
    } catch (reason) {
      intentionalDisconnectRef.current = true;
      await roomRef.current?.disconnect(true); roomRef.current = null;
      intentionalDisconnectRef.current = false;
      callRef.current = null; setCall(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível atender a chamada.");
    } finally {
      callActionRef.current = null;
      setCallActionBusy(false);
    }
  }

  async function decline() {
    if (!incoming || callActionRef.current) return;
    const target = incoming;
    callActionRef.current = "declining";
    setCallActionBusy(true);
    try {
      const { error: updateError } = await supabase.from("resa_calls")
        .update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", target.id).eq("status", "ringing");
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setIncoming((current) => current?.id === target.id ? null : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível recusar a chamada.");
    } finally {
      callActionRef.current = null;
      setCallActionBusy(false);
    }
  }

  async function end() {
    const id = callRef.current?.id;
    if (callTimeoutRef.current !== null) window.clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = null;
    const room = roomRef.current;
    roomRef.current = null; callRef.current = null;
    intentionalDisconnectRef.current = true;
    await room?.disconnect(true);
    intentionalDisconnectRef.current = false;
    setCall(null); setActive(false); setCallStatus("ringing"); setConnected(false); setReconnecting(false); setConnectionFailed(false); setScreenShare(false); setRemoteScreenShare(false);
    if (id) {
      const { error: updateError } = await supabase.from("resa_calls")
        .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
      if (updateError) setError(updateError.message);
    }
  }

  async function toggleMute() {
    const next = !muted;
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar o microfone.");
    }
  }

  async function toggleCamera() {
    const next = !camera;
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(next);
      setCamera(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível aceder à câmara. Verifique a permissão do navegador.");
    }
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room || !connected) return;
    try {
      const next = !screenShare;
      await room.localParticipant.setScreenShareEnabled(next, next ? { audio: true } : undefined);
      setScreenShare(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A partilha de ecrã não está disponível neste dispositivo ou navegador.");
      setScreenShare(false);
    }
  }

  async function startAudio() {
    try { await roomRef.current?.startAudio(); } catch { setError("Toque em Ativar áudio para permitir reprodução no navegador."); }
  }

  const peerInitial = peerName.trim().slice(0, 1).toUpperCase() || "R";
  const peerAvatar = peerAvatarUrl ? <img src={peerAvatarUrl} alt="" className="h-full w-full object-cover" /> : <span>{peerInitial}</span>;
  const connectionLabel = reconnecting ? "A recuperar ligação…" : connectionFailed ? "Ligação interrompida" : callStatus === "ringing" ? "A chamar…" : connected ? "Ligado" : "A ligar…";

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={!ready || active || callActionBusy || Boolean(callRef.current)} onClick={() => void start("audio")} aria-label="Iniciar chamada de áudio" title="Chamada de áudio" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0C1A3D] shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d83b5] disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true">☎</span><span>Áudio</span></button>
    <button type="button" disabled={!ready || active || callActionBusy || Boolean(callRef.current)} onClick={() => void start("video")} aria-label="Iniciar videochamada" title="Videochamada" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0C1A3D] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#122858] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d83b5] disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true">▣</span><span>Vídeo</span></button>
    {error&&<span role="alert" className="max-w-[240px] text-xs text-red-600">{error}</span>}
    {incoming&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#061127]/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="resa-incoming-call-title"><div className="w-full max-w-sm rounded-[2rem] border border-white/70 bg-white p-6 text-center shadow-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">RESA · chamada recebida</p>
      <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#eaf0fa] text-2xl font-bold text-[#0C1A3D] ring-4 ring-[#eef2f8]">{peerAvatar}</div>
      <h3 id="resa-incoming-call-title" className="mt-4 text-xl font-bold text-[#0C1A3D]">{peerName}</h3>
      <p className="mt-1 text-sm text-slate-500">{incoming.kind === "video" ? "Videochamada" : "Chamada de áudio"}</p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => void decline()} disabled={callActionBusy} className="min-h-12 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Recusar</button>
        <button type="button" onClick={() => void accept()} disabled={callActionBusy} className="min-h-12 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Atender</button>
      </div>
    </div></div>}
    {active&&<div className="fixed inset-0 z-[60] bg-[#020817] p-2 text-white sm:p-5">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-bold text-white">{peerAvatar}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">{peerName}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-300"><span className={"h-2 w-2 rounded-full " + (connected ? "bg-emerald-400" : reconnecting ? "animate-pulse bg-amber-400" : "bg-slate-400")} />{connectionLabel} · {call?.kind === "video" ? "Videochamada" : "Chamada de áudio"}</p>
              {(screenShare || remoteScreenShare) && <p className="mt-1 text-[11px] text-sky-300">{screenShare ? "Está a partilhar o seu ecrã" : "O participante está a partilhar o ecrã"}</p>}
            </div>
          </div>
          <button type="button" onClick={() => void end()} className="shrink-0 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:px-4 sm:text-sm">{callStatus === "ringing" ? "Cancelar chamada" : "Terminar chamada"}</button>
        </header>
        <main className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1428] sm:mt-4 sm:rounded-[2rem]">
          <div ref={remoteMedia} className="absolute inset-0 flex h-full w-full items-center justify-center gap-3 [&_video]:max-h-full [&_video]:max-w-full" />
          <div ref={remoteScreenMedia} className="absolute inset-0 z-[1] h-full w-full bg-black [&_video]:h-full [&_video]:w-full [&_video]:object-contain" />
          {call?.kind === "video" && <video ref={localVideo} autoPlay muted playsInline aria-label="Pré-visualização da sua câmara" className="absolute bottom-3 right-3 z-10 h-24 w-36 rounded-xl border border-white/25 bg-slate-900 object-cover shadow-2xl sm:bottom-5 sm:right-5 sm:h-36 sm:w-56 sm:rounded-2xl" />}
          {call?.kind === "audio" && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10 text-4xl font-bold text-white ring-8 ring-white/[0.04]">{peerAvatar}</div><p className="mt-5 text-lg font-semibold">{peerName}</p><p className="mt-1 text-sm text-slate-400">{connectionLabel}</p></div>}
        </main>
        <footer className="mx-auto mt-3 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 sm:mt-4 sm:gap-3 sm:p-3">
          <button type="button" onClick={() => void toggleMute()} aria-label={muted ? "Ligar microfone" : "Desligar microfone"} aria-pressed={muted} className={"flex min-h-12 min-w-[112px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-none sm:px-5 sm:text-sm " + (muted ? "bg-rose-600 text-white" : "bg-white/10 text-white hover:bg-white/15")}><span aria-hidden="true">{muted ? "◉" : "◌"}</span>{muted ? "Ligar microfone" : "Desligar microfone"}</button>
          {call?.kind === "video" && <button type="button" onClick={() => void toggleCamera()} aria-label={camera ? "Desligar câmara" : "Ligar câmara"} aria-pressed={!camera} className={"flex min-h-12 min-w-[112px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-none sm:px-5 sm:text-sm " + (camera ? "bg-white/10 text-white hover:bg-white/15" : "bg-rose-600 text-white")}><span aria-hidden="true">▣</span>{camera ? "Desligar câmara" : "Ligar câmara"}</button>}
          <button type="button" onClick={() => void toggleScreenShare()} disabled={!connected} aria-pressed={screenShare} className={"flex min-h-12 min-w-[112px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-5 sm:text-sm " + (screenShare ? "bg-sky-500 text-white" : "bg-white/10 text-white hover:bg-white/15")}>{screenShare ? "Parar partilha" : "Partilhar ecrã"}</button>
          <button type="button" onClick={() => void startAudio()} className="min-h-12 flex-1 rounded-xl bg-white/10 px-3 py-3 text-xs font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-none sm:px-5 sm:text-sm">Ativar áudio</button>
        </footer>
        {error && <p role="alert" className="mx-auto mt-2 max-w-2xl text-center text-xs text-rose-300">{error}</p>}
      </div>
    </div>}
  </div>;
}
