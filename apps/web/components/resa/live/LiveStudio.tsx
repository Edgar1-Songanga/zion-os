"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { resaRequest } from "@/lib/resa/api";

type JoinConfig = { joinUrl: string; token: string; roomId: string; isHost?: boolean; role?: "host" | "viewer" };
type LiveMessage = { id: string; identity: string; name: string; text: string; sentAt: number };
type Participant = { identity: string; name: string };
type LivePacket =
  | { type: "chat"; text: string; name?: string }
  | { type: "hand_raise"; name?: string }
  | { type: "speak_granted"; name?: string }
  | { type: "announcement"; text: string; name?: string };

const DATA_TOPIC = "zion-live";

export default function LiveStudio({ liveId, title, onClose }: { liveId: string; title: string; onClose: () => void }) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [connected, setConnected] = useState(false);
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [selfIdentity, setSelfIdentity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [ending, setEnding] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [raisedHands, setRaisedHands] = useState<Participant[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [egressId, setEgressId] = useState<string | null>(null);
  const [streamingExternal, setStreamingExternal] = useState(false);
  const [streamBusy, setStreamBusy] = useState(false);

  const sendPacket = useCallback(async (packet: LivePacket, destinationIdentity?: string) => {
    const room = roomRef.current;
    if (!room || !room.localParticipant.isLocal) return;
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(packet)),
      { reliable: true, topic: DATA_TOPIC, ...(destinationIdentity ? { destinationIdentities: [destinationIdentity] } : {}) },
    );
  }, []);

  const syncParticipants = useCallback((room: Room) => {
    const next: Participant[] = [
      { identity: room.localParticipant.identity, name: room.localParticipant.name || "Tu" },
      ...Array.from(room.remoteParticipants.values()).map((participant) => ({
        identity: participant.identity,
        name: participant.name || participant.identity,
      })),
    ];
    setParticipants(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachRemote = (track: any, _publication: any, participant: any) => {
      if (!remoteRef.current || !participant?.identity) return;
      const element = track.attach() as HTMLMediaElement;
      element.autoplay = true;
      element.dataset.participant = participant.identity;
      if (track.kind === Track.Kind.Video) {
        const video = element as HTMLVideoElement;
        video.playsInline = true;
        video.className = "h-full max-h-[70vh] w-full rounded-2xl bg-black object-contain";
      } else if (track.kind === Track.Kind.Audio) {
        const audio = element as HTMLAudioElement;
        audio.className = "sr-only";
        audio.setAttribute("aria-label", "Áudio da transmissão");
      }
      remoteRef.current.appendChild(element);
      const recordingTrack = (track as any).mediaStreamTrack as MediaStreamTrack | undefined;
      if (recordingTrack && recordingStreamRef.current && !recordingStreamRef.current.getTracks().some((item) => item.id === recordingTrack.id)) recordingStreamRef.current.addTrack(recordingTrack);
      void element.play().catch(() => {
        if (mounted) setNotice("Toque em «Ativar áudio» para permitir a reprodução da transmissão.");
      });
    };

    const removeParticipantTracks = (identity: string) => {
      if (!remoteRef.current) return;
      Array.from(remoteRef.current.querySelectorAll("[data-participant]"))
        .filter((node) => (node as HTMLElement).dataset.participant === identity)
        .forEach((node) => node.remove());
    };

    const onData = (payload: Uint8Array, participant?: any) => {
      try {
        const packet = JSON.parse(new TextDecoder().decode(payload)) as LivePacket;
        const identity = participant?.identity || "system";
        const name = packet.name || participant?.name || identity;
        if (packet.type === "chat" && packet.text?.trim()) {
          setMessages((current) => [...current, {
            id: identity + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
            identity,
            name,
            text: packet.text.trim().slice(0, 1000),
            sentAt: Date.now(),
          }].slice(-200));
        } else if (packet.type === "hand_raise") {
          setRaisedHands((current) => current.some((item) => item.identity === identity) ? current : [...current, { identity, name }]);
          if (room.localParticipant.identity !== identity) setNotice(name + " levantou a mão.");
        } else if (packet.type === "speak_granted" && identity !== room.localParticipant.identity) {
          setNotice("O anfitrião autorizou a tua participação. Já podes ativar o microfone e a câmara.");
          setCanSpeak(true);
          setHandRaised(false);
        } else if (packet.type === "announcement") {
          setNotice(packet.text);
        }
      } catch {
        // Ignore malformed packets instead of breaking the live session.
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, attachRemote)
      .on(RoomEvent.TrackUnsubscribed, (track: any, _publication: any, participant: any) => {
        const recordingTrack = (track as any).mediaStreamTrack as MediaStreamTrack | undefined;
        if (recordingTrack && recordingStreamRef.current?.getTracks().some((item) => item.id === recordingTrack.id)) recordingStreamRef.current.removeTrack(recordingTrack);
        track.detach().forEach((element: HTMLElement) => element.remove());
        if (participant) removeParticipantTracks(participant.identity);
      })
      .on(RoomEvent.ParticipantConnected, () => syncParticipants(room))
      .on(RoomEvent.ParticipantDisconnected, (participant: any) => {
        removeParticipantTracks(participant.identity);
        setRaisedHands((current) => current.filter((item) => item.identity !== participant.identity));
        syncParticipants(room);
      })
      .on(RoomEvent.DataReceived, onData)
      .on(RoomEvent.Connected, () => {
        if (mounted) {
          setConnected(true);
          setSelfIdentity(room.localParticipant.identity);
          syncParticipants(room);
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (mounted) setConnected(false);
      });

    void (async () => {
      try {
        const config = await resaRequest<JoinConfig>("/v1/resa/live/" + liveId + "/join", { method: "POST" });
        if (!config.joinUrl || !config.token) throw new Error("O serviço de vídeo não devolveu credenciais válidas.");
        if (mounted) setIsHost(Boolean(config.isHost || config.role === "host"));
        await room.connect(config.joinUrl, config.token, { autoSubscribe: true });
        if (config.isHost || config.role === "host") {
          await room.localParticipant.enableCameraAndMicrophone();
          const localCamera = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
          if (localCamera && localVideoRef.current) {
            localVideoRef.current.srcObject = new MediaStream([localCamera.mediaStreamTrack]);
            void localVideoRef.current.play().catch(() => {});
          }
          if (mounted) { setCamera(true); setMicrophone(true); }
        }
        syncParticipants(room);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Não foi possível entrar na live.");
      } finally {
        if (mounted) setStarting(false);
      }
    })();

    return () => {
      mounted = false;
      void room.disconnect(true);
      roomRef.current = null;
    };
  }, [liveId, syncParticipants]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !camera;
      await room.localParticipant.setCameraEnabled(next);
      setCamera(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar a câmara.");
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !microphone;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicrophone(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o microfone.");
    }
  }

  function startRecording() {
    const room = roomRef.current;
    if (!room || !isHost || typeof MediaRecorder === "undefined") { setError("A gravação local não é suportada neste navegador."); return; }
    try {
      const tracks: MediaStreamTrack[] = [];
      const collect = (publication: any) => {
        const mediaTrack = publication.track?.mediaStreamTrack as MediaStreamTrack | undefined;
        if (mediaTrack && mediaTrack.readyState === "live" && !tracks.some((item) => item.id === mediaTrack.id)) tracks.push(mediaTrack);
      };
      room.localParticipant.trackPublications.forEach(collect);
      room.remoteParticipants.forEach((participant) => participant.trackPublications.forEach(collect));
      if (!tracks.length) throw new Error("Não existem faixas de áudio/vídeo disponíveis para gravar.");
      const stream = new MediaStream(tracks);
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordingChunksRef.current.push(event.data); };
      recorder.onerror = () => { setError("A gravação foi interrompida pelo navegador."); setRecording(false); };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current; recordingChunksRef.current = []; recordingStreamRef.current = null;
        if (!chunks.length) { setRecording(false); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
        anchor.href = url; anchor.download = "zion-resa-live-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm";
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        setRecording(false); setNotice("Gravação concluída. O ficheiro foi preparado para guardar neste dispositivo.");
      };
      recordingStreamRef.current = stream; recorderRef.current = recorder; recorder.start(1000); setRecording(true);
      setNotice("A gravação local começou. Informa os participantes e respeita o consentimento antes de gravar.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível iniciar a gravação local."); }
  }

  function stopRecording() { const recorder = recorderRef.current; if (recorder && recorder.state !== "inactive") recorder.stop(); recorderRef.current = null; }

  async function startExternalStream() {
    if (!isHost || !streamUrl.trim() || streamBusy) return;
    setStreamBusy(true); setError(null);
    try {
      const result = await resaRequest<{ egressId: string; destination: string }>("/v1/resa/live/" + liveId + "/stream", { method: "POST", body: JSON.stringify({ streamUrl: streamUrl.trim() }) });
      setEgressId(result.egressId); setStreamingExternal(true);
      setNotice("Transmissão externa iniciada para " + result.destination + ". Confirma o estado no painel dessa plataforma.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível iniciar a transmissão externa. O LiveKit Egress pode não estar configurado."); }
    finally { setStreamBusy(false); }
  }

  async function stopExternalStream() {
    if (!isHost || !egressId || streamBusy) return;
    setStreamBusy(true); setError(null);
    try {
      await resaRequest("/v1/resa/live/" + liveId + "/stream/stop", { method: "POST", body: JSON.stringify({ egressId }) });
      setEgressId(null); setStreamingExternal(false); setStreamUrl(""); setNotice("A transmissão externa foi parada.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível parar a transmissão externa."); }
    finally { setStreamBusy(false); }
  }
  async function startAudio() {
    try {
      await roomRef.current?.startAudio();
      setNotice("Áudio ativado.");
    } catch {
      setNotice("O navegador não permitiu reproduzir o áudio. Verifica as permissões do dispositivo.");
    }
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !screenShare;
      await room.localParticipant.setScreenShareEnabled(next);
      setScreenShare(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível partilhar o ecrã. Verifica as permissões do navegador.");
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    try {
      await sendPacket({ type: "chat", text, name: roomRef.current?.localParticipant.name || "Participante" });
      setMessages((current) => [...current, {
        id: selfIdentity + "-" + Date.now(),
        identity: selfIdentity,
        name: "Tu",
        text,
        sentAt: Date.now(),
      }].slice(-200));
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "A mensagem não foi enviada.");
    }
  }

  async function raiseHand() {
    try {
      await sendPacket({ type: "hand_raise", name: roomRef.current?.localParticipant.name || "Participante" });
      setHandRaised(true);
      setNotice("Pedido enviado ao anfitrião.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível levantar a mão.");
    }
  }

  async function moderate(identity: string, action: "allow_speak" | "revoke_speak" | "remove") {
    try {
      await resaRequest("/v1/resa/live/" + liveId + "/participants/" + encodeURIComponent(identity), {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (action === "allow_speak") {
        await sendPacket({ type: "speak_granted", name: roomRef.current?.localParticipant.name || "Anfitrião" }, identity);
        setRaisedHands((current) => current.filter((item) => item.identity !== identity));
      } else if (action === "remove") {
        setRaisedHands((current) => current.filter((item) => item.identity !== identity));
      }
      setNotice(action === "allow_speak" ? "Participante autorizado a falar." : action === "revoke_speak" ? "Permissão de publicação retirada." : "Participante removido da live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível aplicar a ação de moderação.");
    }
  }

  async function leaveLive() {
    await roomRef.current?.disconnect(true);
    onClose();
  }

  async function endLive() {
    if (!isHost || ending) return;
    if (!window.confirm("Queres encerrar esta live para todos os participantes?")) return;
    setEnding(true);
    setError(null);
    try {
      if (recording) stopRecording();
      if (egressId) await stopExternalStream();
      await resaRequest("/v1/resa/live/" + liveId + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "ended" }),
      });
      if (recording) stopRecording();
      if (egressId) await stopExternalStream();
      await roomRef.current?.disconnect(true);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível encerrar a live.");
      setEnding(false);
    }
  }

  const hostControls = (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => void toggleMicrophone()} disabled={!connected} className="rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold disabled:opacity-40">{microphone ? "Microfone ligado" : "Ligar microfone"}</button>
      <button onClick={() => void toggleCamera()} disabled={!connected} className="rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold disabled:opacity-40">{camera ? "Câmara ligada" : "Ligar câmara"}</button>
      <button onClick={() => void toggleScreenShare()} disabled={!connected} className="col-span-2 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold disabled:opacity-40">{screenShare ? "Parar partilha do ecrã" : "Partilhar ecrã"}</button>
      <button onClick={() => recording ? stopRecording() : startRecording()} disabled={!connected || !isHost} className={"col-span-2 rounded-xl px-3 py-3 text-left text-sm font-semibold disabled:opacity-40 " + (recording ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white")}>{recording ? "Parar gravação e guardar ficheiro" : "Gravar nesta máquina (sem armazenamento na nuvem)"}</button>
      <div className="col-span-2 space-y-2 rounded-xl border border-white/10 bg-black/15 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Transmitir noutras plataformas</p>
        <p className="text-xs leading-5 text-slate-400">Cola o URL RTMP/RTMPS do YouTube Live ou Facebook Live. A chave não é guardada pelo Zion.</p>
        <input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} type="password" autoComplete="off" placeholder="URL RTMP/RTMPS + chave da plataforma" disabled={streamingExternal || streamBusy} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-300/50 disabled:opacity-50" />
        {streamingExternal
          ? <button onClick={() => void stopExternalStream()} disabled={streamBusy} className="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-50">{streamBusy ? "A processar…" : "Parar transmissão externa"}</button>
          : <button onClick={() => void startExternalStream()} disabled={!connected || !streamUrl.trim() || streamBusy} className="w-full rounded-lg bg-sky-300 px-3 py-2 text-sm font-bold text-[#07142c] disabled:opacity-40">{streamBusy ? "A iniciar…" : "Iniciar transmissão externa"}</button>}
        <p className="text-[11px] leading-4 text-amber-200/80">Requer LiveKit Egress ativo e pode consumir quota paga do fornecedor. A gravação local não usa esse serviço.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020817]/95 p-2 backdrop-blur-md sm:p-5">
      <div className="flex h-[min(940px,98vh)] w-full max-w-7xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#08152f] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">ZION · RESA Live</p>
            <h2 className="truncate font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{starting ? "A estabelecer ligação…" : connected ? (isHost ? "Estás a transmitir como anfitrião" : "Ligado como espectador") : "Sem ligação"}{recording ? " · GRAVAÇÃO ATIVA" : ""}{streamingExternal ? " · SAÍDA EXTERNA ATIVA" : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => void startAudio()} disabled={!connected} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">Ativar áudio</button>
            <button onClick={() => void leaveLive()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">{isHost ? "Sair do Studio" : "Sair da live"}</button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="flex min-h-0 flex-col gap-3 p-3 sm:p-5">
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black p-2">
              <div ref={remoteRef} className="grid h-full w-full grid-cols-1 content-center gap-3 sm:grid-cols-2" />
              {isHost && <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-24 w-36 rounded-xl border border-white/20 bg-slate-900 object-cover shadow-2xl sm:h-32 sm:w-48" />}
              {!connected && <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 text-center text-sm text-slate-300">{error || (starting ? "A preparar áudio e vídeo…" : "A ligação foi interrompida.")}</div>}
            </div>
            {notice && <div role="status" className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">{notice}<button onClick={() => setNotice(null)} className="ml-3 underline">Fechar</button></div>}
            {error && connected && <div role="alert" className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            <div className="flex flex-wrap items-center gap-2">
              {isHost || canSpeak ? hostControls : <button onClick={() => void raiseHand()} disabled={!connected || handRaised} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{handRaised ? "Pedido para falar enviado" : "Levantar a mão"}</button>}
              {isHost && <button onClick={() => void endLive()} disabled={ending} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{ending ? "A encerrar…" : "Encerrar live para todos"}</button>}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col border-t border-white/10 bg-white/[0.035] lg:border-l lg:border-t-0">
            <div className="grid grid-cols-2 border-b border-white/10">
              <button onClick={() => setTab("chat")} className={"px-4 py-4 text-sm font-semibold " + (tab === "chat" ? "border-b-2 border-sky-300 text-white" : "text-slate-400")}>Chat ao vivo</button>
              <button onClick={() => setTab("people")} className={"px-4 py-4 text-sm font-semibold " + (tab === "people" ? "border-b-2 border-sky-300 text-white" : "text-slate-400")}>Pessoas ({participants.length})</button>
            </div>

            {tab === "chat" ? (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length ? messages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <span className="font-semibold text-sky-200">{message.name}: </span>
                      <span className="break-words text-slate-200">{message.text}</span>
                    </div>
                  )) : <p className="py-6 text-center text-sm leading-6 text-slate-400">As mensagens desta live aparecerão aqui.</p>}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-white/10 p-3">
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Escreve uma mensagem…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-300/50" />
                  <button type="submit" disabled={!connected || !draft.trim()} className="rounded-xl bg-sky-300 px-4 py-3 text-sm font-bold text-[#07142c] disabled:opacity-40">Enviar</button>
                </form>
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {isHost && raisedHands.length > 0 && <div className="mb-4 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-200">Pedidos para falar</p>
                  {raisedHands.map((person) => <div key={person.identity} className="mb-2 flex items-center justify-between gap-2 text-sm text-white">
                    <span className="truncate">{person.name}</span>
                    <button onClick={() => void moderate(person.identity, "allow_speak")} className="rounded-lg bg-sky-300 px-2 py-1 text-xs font-bold text-[#07142c]">Autorizar</button>
                  </div>)}
                </div>}
                {participants.map((person) => (
                  <div key={person.identity} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm text-white">
                    <div className="min-w-0"><p className="truncate font-medium">{person.name}</p><p className="text-xs text-slate-500">{person.identity === selfIdentity ? "Este dispositivo" : isHost ? "Participante" : "Na live"}</p></div>
                    {isHost && person.identity !== selfIdentity && <div className="flex shrink-0 gap-1">
                      <button title="Autorizar a falar" onClick={() => void moderate(person.identity, "allow_speak")} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Falar</button>
                      <button title="Retirar permissão de falar" onClick={() => void moderate(person.identity, "revoke_speak")} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Silenciar</button>
                      <button title="Remover da live" onClick={() => void moderate(person.identity, "remove")} className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-200">Remover</button>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
