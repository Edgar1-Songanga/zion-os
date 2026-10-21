"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { resaRequest } from "@/lib/resa/api";

type JoinConfig = { joinUrl: string; token: string; roomId: string; displayName?: string; isHost?: boolean; isModerator?: boolean; role?: "host" | "moderator" | "viewer" };
type LiveMessage = { id: string; identity: string; name: string; text: string; sentAt: number };
type PersistedLiveMessage = { id: string; sender_id: string; name: string; text: string; sent_at: string };
type Participant = { identity: string; name: string };
type LivePacket =
  | { type: "chat"; text: string; name?: string }
  | { type: "hand_raise"; name?: string }
  | { type: "speak_granted"; name?: string }
  | { type: "speak_revoked"; name?: string }
  | { type: "announcement"; text: string; name?: string }
  | { type: "reaction"; emoji: string; name?: string };

const DATA_TOPIC = "zion-live";

function renderLinkedText(value: string) {
  return value.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
    /^https?:\/\//i.test(part)
      ? <a key={index} href={part} target="_blank" rel="noreferrer" className="break-all text-sky-300 underline underline-offset-2 hover:text-sky-100">{part}</a>
      : part,
  );
}



export default function LiveStudio({ liveId, title, isPrivate = false, isHostSession = false, onClose }: { liveId: string; title: string; isPrivate?: boolean; isHostSession?: boolean; onClose: () => void }) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaObjectUrlRef = useRef<string | null>(null);
  const mediaTracksRef = useRef<MediaStreamTrack[]>([]);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const liveStartedAtRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [joinMode, setJoinMode] = useState<"video" | "audio" | "listen" | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [screenShare, setScreenShare] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorIds, setModeratorIds] = useState<string[]>([]);
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
  const [audioNeedsGesture, setAudioNeedsGesture] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [stageLayout, setStageLayout] = useState<"grid" | "stage">("grid");
  const [liveReactions, setLiveReactions] = useState<Array<{ id: string; emoji: string; name: string }>>([]);
  const [mediaSource, setMediaSource] = useState<string | null>(null);
  const [mediaFileType, setMediaFileType] = useState<"audio" | "video" | null>(null);
  const [mediaFileName, setMediaFileName] = useState("");
  const [mediaBroadcasting, setMediaBroadcasting] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);

  const refreshMediaDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput" && device.deviceId);
      const microphones = devices.filter((device) => device.kind === "audioinput" && device.deviceId);
      setCameraDevices(cameras);
      setMicrophoneDevices(microphones);
      setSelectedCameraId((current) => cameras.some((device) => device.deviceId === current) ? current : (cameras[0]?.deviceId || ""));
      setSelectedMicrophoneId((current) => microphones.some((device) => device.deviceId === current) ? current : (microphones[0]?.deviceId || ""));
    } catch {
      // Device enumeration is optional; browser permissions can temporarily hide labels or devices.
    }
  }, []);

  useEffect(() => {
    void refreshMediaDevices();
    const devices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    devices?.addEventListener?.("devicechange", refreshMediaDevices);
    return () => devices?.removeEventListener?.("devicechange", refreshMediaDevices);
  }, [refreshMediaDevices]);

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
    if (!joinMode) { setStarting(false); return; }
    setStarting(true);
    let mounted = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachRemote = (track: any, _publication: any, participant: any) => {
      if (!remoteRef.current || !participant?.identity) return;
      const element = track.attach() as HTMLMediaElement;
      const participantName = participant.name || participant.identity;
      element.autoplay = true;
      element.dataset.participant = participant.identity;
      element.title = participantName;
      if (track.kind === Track.Kind.Video) {
        const video = element as HTMLVideoElement;
        video.playsInline = true;
        video.className = "h-full max-h-[70vh] min-h-[180px] w-full rounded-2xl bg-black object-contain";
        video.setAttribute("aria-label", "Vídeo de " + participantName);
        const tile = document.createElement("div");
        tile.className = "relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950";
        tile.dataset.participant = participant.identity;
        tile.appendChild(video);
        const label = document.createElement("span");
        label.className = "absolute bottom-2 left-2 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur";
        label.textContent = participantName;
        tile.appendChild(label);
        remoteRef.current.appendChild(tile);
      } else if (track.kind === Track.Kind.Audio) {
        const audio = element as HTMLAudioElement;
        audio.className = "sr-only";
        audio.setAttribute("aria-label", "Áudio de " + participantName);
        remoteRef.current.appendChild(audio);
      }
      const recordingTrack = (track as any).mediaStreamTrack as MediaStreamTrack | undefined;
      if (recordingTrack && recordingStreamRef.current && !recordingStreamRef.current.getTracks().some((item) => item.id === recordingTrack.id)) recordingStreamRef.current.addTrack(recordingTrack);
      void element.play().catch(() => {
        if (mounted) {
          setAudioNeedsGesture(true);
          setNotice("O navegador bloqueou o áudio automático. Toca em Ativar áudio para ouvir a transmissão.");
        }
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
          setNotice("A moderação autorizou a tua participação. Já podes ativar o microfone e a câmara.");
          setCanSpeak(true);
          setHandRaised(false);
        } else if (packet.type === "speak_revoked" && identity !== room.localParticipant.identity) {
          setCanSpeak(false);
          setHandRaised(false);
          void room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
          void room.localParticipant.setCameraEnabled(false).catch(() => {});
          void room.localParticipant.setScreenShareEnabled(false).catch(() => {});
          setMicrophone(false);
          setCamera(false);
          setScreenShare(false);
          setNotice("A moderação retirou a tua permissão de falar. O microfone, a câmara e a partilha foram desligados.");
        } else if (packet.type === "announcement") {
          setNotice(packet.text);
        } else if (packet.type === "reaction" && ["👏", "❤️", "🙏", "🔥", "✨", "🙌"].includes(packet.emoji)) {
          const reaction = { id: identity + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), emoji: packet.emoji, name };
          setLiveReactions((current) => [...current.slice(-11), reaction]);
          window.setTimeout(() => setLiveReactions((current) => current.filter((item) => item.id !== reaction.id)), 5000);
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
          liveStartedAtRef.current = Date.now();
          setSelfIdentity(room.localParticipant.identity);
          syncParticipants(room);
          void resaRequest<PersistedLiveMessage[]>("/v1/resa/live/" + liveId + "/messages?limit=100")
            .then((history) => { if (mounted) setMessages(history.map((item) => ({ id: item.id, identity: item.sender_id, name: item.name, text: item.text, sentAt: Date.parse(item.sent_at) || Date.now() }))); })
            .catch(() => { if (mounted) setNotice("O chat está ligado, mas o histórico não pôde ser carregado. As novas mensagens continuam disponíveis."); });
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (mounted) setConnected(false);
      });

    void (async () => {
      try {
        const config = await resaRequest<JoinConfig>("/v1/resa/live/" + liveId + "/join", { method: "POST", body: JSON.stringify(joinPassword ? { password: joinPassword } : {}) });
        if (!config.joinUrl || !config.token) throw new Error("O serviço de vídeo não devolveu credenciais válidas.");
        const hostRole = Boolean(config.isHost || config.role === "host");
        if (mounted) { setIsHost(hostRole); setIsModerator(Boolean(config.isModerator || config.role === "moderator")); }
        if (hostRole) {
          void resaRequest<Array<{ moderator_user_id: string }>>("/v1/resa/live/" + liveId + "/moderators")
            .then((items) => { if (mounted) setModeratorIds(items.map((item) => item.moderator_user_id)); })
            .catch(() => { if (mounted) setNotice("A Live está ligada, mas a lista de moderadores não pôde ser carregada."); });
        }
        await room.connect(config.joinUrl, config.token, { autoSubscribe: true });
        const displayName = config.displayName || room.localParticipant.name || "Membro RESA";
        if (mounted) setSelfIdentity(room.localParticipant.identity);
        if (joinMode === "video") {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        } else if (joinMode === "audio") {
          await room.localParticipant.setCameraEnabled(false);
          await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        } else {
          await room.localParticipant.setCameraEnabled(false);
          await room.localParticipant.setMicrophoneEnabled(false);
        }
        const localCamera = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (localCamera && localVideoRef.current && joinMode === "video") {
          localVideoRef.current.srcObject = new MediaStream([localCamera.mediaStreamTrack]);
          void localVideoRef.current.play().catch(() => {});
        }
        if (mounted) { setCamera(joinMode === "video"); setMicrophone(joinMode !== "listen"); setCanSpeak(true); setNotice("Entraste como " + displayName + ". Podes alterar o áudio e o vídeo nos controlos da Live."); }
        syncParticipants(room);
      } catch (e) {
        if (mounted) { setError(e instanceof Error ? e.message : "Não foi possível entrar na live."); setJoinMode(null); }
      } finally {
        if (mounted) setStarting(false);
      }
    })();

    return () => {
      mounted = false;
      void room.disconnect(true);
      roomRef.current = null;
    };
  }, [liveId, syncParticipants, joinMode, joinPassword]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const video = localVideoRef.current;
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!video) return;
    if (camera && connected && track) {
      video.srcObject = new MediaStream([track.mediaStreamTrack]);
      void video.play().catch(() => {});
    } else if (!camera) {
      video.srcObject = null;
    }
  }, [camera, connected]);

  useEffect(() => {
    if (!connected) return;
    const updateElapsed = () => setLiveElapsed(Math.max(0, Math.floor((Date.now() - (liveStartedAtRef.current ?? Date.now())) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  async function sendReaction(emoji: string) {
    if (!connected) return;
    try {
      await sendPacket({ type: "reaction", emoji, name: roomRef.current?.localParticipant.name || "Participante" });
      const own = { id: selfIdentity + "-reaction-" + Date.now(), emoji, name: "Tu" };
      setLiveReactions((current) => [...current.slice(-11), own]);
      window.setTimeout(() => setLiveReactions((current) => current.filter((item) => item.id !== own.id)), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a reação.");
    }
  }

  async function copyLiveLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/resa/live?live=" + encodeURIComponent(liveId));
      setNotice("Link desta Live copiado. Para transmissões privadas, o convidado precisará da palavra-passe.");
    } catch {
      setNotice("Copia o endereço da área Live a partir da barra do navegador para o partilhares.");
    }
  }

  const elapsedLabel = [Math.floor(liveElapsed / 3600), Math.floor((liveElapsed % 3600) / 60), liveElapsed % 60].map((part) => String(part).padStart(2, "0")).join(":");

  function chooseJoinMode(mode: "video" | "audio" | "listen") {
    if (isPrivate && !isHostSession) {
      const password = window.prompt("Esta Live é privada. Introduz a palavra-passe fornecida pelo anfitrião:");
      if (password === null) return;
      if (!password.trim()) { setError("A palavra-passe é obrigatória para entrar numa Live privada."); return; }
      setJoinPassword(password);
    }
    setStarting(true);
    setJoinMode(mode);
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !camera;
      await room.localParticipant.setCameraEnabled(next, next && selectedCameraId ? { deviceId: selectedCameraId } : undefined);
      setCamera(next);
      if (next) void refreshMediaDevices();
      const localCamera = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = next && localCamera ? new MediaStream([localCamera.mediaStreamTrack]) : null;
        if (next) void localVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar a câmara.");
    }
  }

  async function changeCameraDevice(deviceId: string) {
    setSelectedCameraId(deviceId);
    const room = roomRef.current;
    if (!camera || !room || !deviceId) return;
    try {
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as { setDeviceId?: (id: string) => Promise<unknown> } | undefined;
      if (track?.setDeviceId) await track.setDeviceId(deviceId);
      else {
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setCameraEnabled(true, { deviceId });
      }
      await refreshMediaDevices();
      setNotice("Câmara alterada neste dispositivo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível trocar de câmara. Verifica as permissões do navegador.");
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !microphone;
      await room.localParticipant.setMicrophoneEnabled(next, {
        ...(next && selectedMicrophoneId ? { deviceId: selectedMicrophoneId } : {}),
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      setMicrophone(next);
      if (next) void refreshMediaDevices();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o microfone.");
    }
  }

  async function changeMicrophoneDevice(deviceId: string) {
    setSelectedMicrophoneId(deviceId);
    const room = roomRef.current;
    if (!microphone || !room || !deviceId) return;
    try {
      const track = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as { setDeviceId?: (id: string) => Promise<unknown> } | undefined;
      if (track?.setDeviceId) await track.setDeviceId(deviceId);
      else {
        await room.localParticipant.setMicrophoneEnabled(false);
        await room.localParticipant.setMicrophoneEnabled(true, { deviceId, echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      }
      await refreshMediaDevices();
      setNotice("Microfone alterado neste dispositivo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível trocar de microfone. Verifica as permissões do navegador.");
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
      setAudioNeedsGesture(false);
      setNotice("Áudio da transmissão ativado.");
    } catch {
      setAudioNeedsGesture(true);
      setNotice("O navegador ainda não permitiu reproduzir o áudio. Verifica as permissões e o volume do dispositivo.");
    }
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room || (!isHost && !canSpeak)) return;
    try {
      const next = !screenShare;
      if (next && typeof navigator !== "undefined" && !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Este navegador/dispositivo não suporta partilha de ecrã. Experimenta um navegador atualizado num computador.");
      }
      // Request shared-tab/system audio where the browser and device permit it.
      // The browser still asks the participant to select what will be shared.
      await room.localParticipant.setScreenShareEnabled(next, next ? { audio: true } : undefined);
      setScreenShare(next);
      if (next) setNotice("Partilha iniciada. Se o navegador apresentar a opção, ativa também «Partilhar áudio» para transmitir música e som do vídeo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível partilhar o ecrã. Verifica as permissões do navegador.");
    }
  }

  async function shareBibleChallenge() {
    if (!connected) return;
    const text = "✦ Convite espiritual: vem fazer o Bible Challenge comigo no ZION OS! Explora as Escrituras e avança ao teu ritmo: " + window.location.origin + "/bible-engine#bible-challenge";
    try {
      await sendPacket({ type: "chat", text, name: roomRef.current?.localParticipant.name || "Participante" });
      setMessages((current) => [...current, {
        id: selfIdentity + "-bible-challenge-" + Date.now(),
        identity: selfIdentity,
        name: "Tu",
        text,
        sentAt: Date.now(),
      }].slice(-200));
      setNotice("Convite para o Bible Challenge enviado ao chat desta Live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível partilhar o convite no chat da Live.");
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    try {
      const saved = await resaRequest<PersistedLiveMessage>("/v1/resa/live/" + liveId + "/messages", {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setMessages((current) => [...current, {
        id: saved.id,
        identity: saved.sender_id,
        name: saved.name || "Tu",
        text: saved.text,
        sentAt: Date.parse(saved.sent_at) || Date.now(),
      }].slice(-200));
      setDraft("");
      try {
        await sendPacket({ type: "chat", text: saved.text, name: saved.name || "Participante" });
      } catch {
        setNotice("Mensagem guardada no histórico. A entrega em tempo real pode estar atrasada.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "A mensagem não foi guardada. Tenta novamente.");
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

  async function moderateAll(action: "allow_speak" | "revoke_speak") {
    if (!isHost) return;
    const targets = participants.filter((person) => person.identity !== selfIdentity);
    if (!targets.length) { setNotice("Ainda não há outros participantes para gerir."); return; }
    setError(null);
    const results = await Promise.allSettled(targets.map(async (person) => {
      await resaRequest("/v1/resa/live/" + liveId + "/participants/" + encodeURIComponent(person.identity), {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await sendPacket(
        { type: action === "allow_speak" ? "speak_granted" : "speak_revoked", name: roomRef.current?.localParticipant.name || "Anfitrião" },
        person.identity,
      );
    }));
    const applied = results.filter((result) => result.status === "fulfilled").length;
    if (applied !== targets.length) setError("A ação foi aplicada a " + applied + " de " + targets.length + " participantes. Verifica as permissões e tenta novamente.");
    else setNotice(action === "allow_speak" ? "Publicação autorizada para todos os participantes presentes." : "Microfones, câmaras e partilhas foram bloqueados para os participantes presentes.");
  }

  async function toggleModerator(identity: string) {
    if (!isHost) return;
    const enabled = !moderatorIds.includes(identity);
    try {
      await resaRequest("/v1/resa/live/" + liveId + "/moderators", {
        method: "POST",
        body: JSON.stringify({ identity, enabled }),
      });
      setModeratorIds((current) => enabled ? [...new Set([...current, identity])] : current.filter((id) => id !== identity));
      setNotice(enabled ? "Moderador nomeado para esta Live." : "Permissão de moderador retirada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar a função de moderador.");
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
      } else if (action === "revoke_speak") {
        await sendPacket({ type: "speak_revoked", name: roomRef.current?.localParticipant.name || "Anfitrião" }, identity);
        setRaisedHands((current) => current.filter((item) => item.identity !== identity));
      } else if (action === "remove") {
        setRaisedHands((current) => current.filter((item) => item.identity !== identity));
      }
      setNotice(action === "allow_speak" ? "Participante autorizado a falar." : action === "revoke_speak" ? "Permissão de publicação retirada." : "Participante removido da live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível aplicar a ação de moderação.");
    }
  }

  function handleMediaFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setError("Escolhe um ficheiro de áudio ou vídeo suportado pelo navegador.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("O ficheiro excede o limite local de 500 MB.");
      return;
    }
    if (mediaBroadcasting) {
      setError("Para trocar o ficheiro, primeiro para a transmissão do leitor.");
      return;
    }
    if (mediaObjectUrlRef.current) URL.revokeObjectURL(mediaObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    mediaObjectUrlRef.current = url;
    setMediaSource(url);
    setMediaFileType(file.type.startsWith("video/") ? "video" : "audio");
    setMediaFileName(file.name);
    setError(null);
    setNotice("Ficheiro carregado localmente. Carrega em reproduzir e, se o navegador suportar captura de mídia, transmite-o para os participantes.");
  }

  async function stopMediaBroadcast() {
    const room = roomRef.current;
    const tracks = mediaTracksRef.current;
    mediaTracksRef.current = [];
    for (const track of tracks) {
      try { if (room) await room.localParticipant.unpublishTrack(track); } catch { /* Track may already have been unpublished during disconnect. */ }
      try { track.stop(); } catch { /* Ignore tracks already stopped by the browser. */ }
    }
    setMediaBroadcasting(false);
    setMediaBusy(false);
  }

  async function toggleMediaBroadcast() {
    if (mediaBroadcasting) {
      await stopMediaBroadcast();
      setNotice("A transmissão do leitor foi parada.");
      return;
    }
    const room = roomRef.current;
    const element = mediaVideoRef.current ?? mediaAudioRef.current;
    if (!isHost || !connected || !room || !element) return;
    setMediaBusy(true);
    setError(null);
    try {
      await element.play();
      const capturable = element as HTMLMediaElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
      const stream = capturable.captureStream?.() ?? capturable.mozCaptureStream?.();
      if (!stream) throw new Error("Este navegador não permite transmitir diretamente o leitor. Usa «Partilhar ecrã + áudio» neste dispositivo.");
      const tracks = stream.getTracks().filter((track) => track.readyState === "live");
      if (!tracks.length) throw new Error("O leitor ainda não disponibilizou faixas de áudio/vídeo. Inicia a reprodução e tenta novamente.");
      mediaTracksRef.current = tracks;
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track, { name: "zion-live-media-" + track.kind });
      }
      setMediaBroadcasting(true);
      setNotice("Leitor transmitido: áudio" + (tracks.some((track) => track.kind === "video") ? " e vídeo" : "") + " disponíveis para os participantes.");
    } catch (e) {
      await stopMediaBroadcast();
      setError(e instanceof Error ? e.message : "Não foi possível transmitir a mídia para a Live.");
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => () => {
    if (mediaObjectUrlRef.current) URL.revokeObjectURL(mediaObjectUrlRef.current);
  }, []);

  async function leaveLive() {
    if (recording) stopRecording();
    if (egressId) await stopExternalStream();
    await stopMediaBroadcast();
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
      await stopMediaBroadcast();
      await resaRequest("/v1/resa/live/" + liveId + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "ended" }),
      });
      await roomRef.current?.disconnect(true);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível encerrar a live.");
      setEnding(false);
    }
  }

  const hostControls = (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 rounded-xl border border-white/10 bg-black/15 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Permissões de palco</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void moderateAll("allow_speak")} disabled={!connected || participants.length < 2} className="rounded-lg bg-sky-300/15 px-3 py-2 text-xs font-semibold text-sky-100 disabled:opacity-40">Abrir áudio/vídeo para todos</button>
          <button type="button" onClick={() => void moderateAll("revoke_speak")} disabled={!connected || participants.length < 2} className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-40">Silenciar e fechar para todos</button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">Aplica-se aos participantes já presentes; novos acessos ainda seguem a política padrão da sessão.</p>
      </div>
      <div className="col-span-2 space-y-3 rounded-xl border border-sky-200/15 bg-sky-300/[0.04] p-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-200">Leitor de áudio e vídeo</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">Escolhe um ficheiro local para reproduzir no Studio. Em navegadores compatíveis, podes publicar o áudio/vídeo como faixas reais da Live — sem depender apenas da partilha de ecrã.</p>
        </div>
        <input type="file" accept="audio/*,video/*" onChange={handleMediaFileChange} disabled={!isHost || mediaBroadcasting || mediaBusy} aria-label="Escolher ficheiro de áudio ou vídeo" className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white disabled:opacity-50" />
        {mediaFileName && <p className="truncate text-xs text-sky-100" title={mediaFileName}>{mediaFileName}</p>}
        {mediaSource && mediaFileType === "video" && <video ref={mediaVideoRef} src={mediaSource} controls playsInline onEnded={() => { if (mediaBroadcasting) void stopMediaBroadcast(); }} className="max-h-56 w-full rounded-lg bg-black" />}
        {mediaSource && mediaFileType === "audio" && <audio ref={mediaAudioRef} src={mediaSource} controls onEnded={() => { if (mediaBroadcasting) void stopMediaBroadcast(); }} className="w-full" />}
        <button type="button" onClick={() => void toggleMediaBroadcast()} disabled={!connected || !isHost || !mediaSource || mediaBusy} className={"w-full rounded-lg px-3 py-2.5 text-sm font-bold disabled:opacity-40 " + (mediaBroadcasting ? "bg-rose-500/20 text-rose-100" : "bg-sky-300 text-[#07142c]")}>{mediaBusy ? "A preparar faixas…" : mediaBroadcasting ? "Parar transmissão do leitor" : "Transmitir leitor para a Live"}</button>
        <p className="text-[11px] leading-4 text-slate-500">A reprodução local funciona nos navegadores com suporte ao formato. A transmissão direta depende do suporte de captura de mídia do navegador; se indisponível, usa a partilha de ecrã com áudio. O ficheiro não é enviado nem guardado no servidor.</p>
      </div>
      <button onClick={() => recording ? stopRecording() : startRecording()} disabled={!connected || !isHost} className={"col-span-2 rounded-xl px-3 py-3 text-left text-sm font-semibold disabled:opacity-40 " + (recording ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white")}>{recording ? "Parar gravação e guardar ficheiro" : "Gravar nesta máquina (sem armazenamento na nuvem)"}</button>
      <div className="col-span-2 space-y-2 rounded-xl border border-white/10 bg-black/15 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Transmitir noutras plataformas</p>
        <p className="text-xs leading-5 text-slate-400">Cola o URL RTMP/RTMPS do YouTube Live ou Facebook Live. A chave não é guardada pelo Zion.</p>
        <input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} type="password" autoComplete="off" placeholder="URL RTMP/RTMPS + chave da plataforma" disabled={!isHost || streamingExternal || streamBusy} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-300/50 disabled:opacity-50" />
        {streamingExternal
          ? <button onClick={() => void stopExternalStream()} disabled={streamBusy} className="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-50">{streamBusy ? "A processar…" : "Parar transmissão externa"}</button>
          : <button onClick={() => void startExternalStream()} disabled={!connected || !isHost || !streamUrl.trim() || streamBusy} className="w-full rounded-lg bg-sky-300 px-3 py-2 text-sm font-bold text-[#07142c] disabled:opacity-40">{streamBusy ? "A iniciar…" : "Iniciar transmissão externa"}</button>}
        <p className="text-[11px] leading-4 text-amber-200/80">Requer LiveKit Egress ativo e pode consumir quota paga do fornecedor. A gravação local não usa esse serviço.</p>
      </div>
    </div>
  );

  if (!joinMode) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020817]/95 p-3 backdrop-blur-md sm:p-5">
        <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#08152f] p-6 text-white shadow-2xl sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-200">ZION · RESA Live</p>
          <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Escolhe como queres entrar. Podes ligar ou desligar a câmara e o microfone durante a sessão.</p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button onClick={() => chooseJoinMode("video")} className="rounded-2xl border border-sky-200/30 bg-sky-300/10 p-4 text-left transition hover:bg-sky-300/20"><span className="text-2xl">◉</span><span className="mt-3 block text-sm font-semibold">Vídeo e áudio</span><span className="mt-1 block text-xs leading-5 text-slate-400">Entrar com câmara e microfone ligados</span></button>
            <button onClick={() => chooseJoinMode("audio")} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/10"><span className="text-2xl">♫</span><span className="mt-3 block text-sm font-semibold">Só áudio</span><span className="mt-1 block text-xs leading-5 text-slate-400">Participar sem transmitir vídeo</span></button>
            <button onClick={() => chooseJoinMode("listen")} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/10"><span className="text-2xl">◌</span><span className="mt-3 block text-sm font-semibold">Só assistir</span><span className="mt-1 block text-xs leading-5 text-slate-400">Entrar com câmara e microfone desligados</span></button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-slate-500">O navegador poderá pedir autorização para usar a câmara e o microfone.</p><button onClick={onClose} className="shrink-0 rounded-xl border border-white/10 px-4 py-2 text-sm">Cancelar</button></div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020817]/95 p-2 backdrop-blur-md sm:p-5">
      <div className="flex h-[min(940px,98vh)] w-full max-w-7xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#08152f] shadow-2xl">
        <style jsx>{`@keyframes zion-reaction-rise { 0% { transform: translateY(18px) scale(.65); opacity: 0; } 18% { opacity: 1; } 75% { opacity: .95; } 100% { transform: translateY(-90px) scale(1.18); opacity: 0; } } .zion-live-reaction { animation: zion-reaction-rise 3.8s ease-out forwards; }`}</style>
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">ZION · RESA Live</p>
            <h2 className="truncate font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{starting ? "A estabelecer ligação…" : connected ? (isHost ? "Estás a transmitir como anfitrião" : "Ligado como espectador") : "Sem ligação"}{connected ? " · " + elapsedLabel : ""}{recording ? " · GRAVAÇÃO ATIVA" : ""}{streamingExternal ? " · SAÍDA EXTERNA ATIVA" : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {audioNeedsGesture && <button onClick={() => void startAudio()} disabled={!connected} className="rounded-xl border border-sky-200/30 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-300/20">Ativar áudio</button>}
            <button onClick={() => void leaveLive()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">{isHost ? "Sair do Studio" : "Sair da live"}</button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 sm:p-5">
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black p-2">
              <div ref={remoteRef} className={"grid h-full w-full content-center gap-3 " + (stageLayout === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")} />
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-500" /> LIVE <span className="text-white/60">{participants.length} participante{participants.length === 1 ? "" : "s"}</span>
              </div>
              <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur">
                <button type="button" onClick={() => setStageLayout("grid")} aria-pressed={stageLayout === "grid"} className={"rounded-lg px-2.5 py-1.5 text-xs font-semibold " + (stageLayout === "grid" ? "bg-sky-300 text-[#07142c]" : "text-white hover:bg-white/10")}>Grelha</button>
                <button type="button" onClick={() => setStageLayout("stage")} aria-pressed={stageLayout === "stage"} className={"rounded-lg px-2.5 py-1.5 text-xs font-semibold " + (stageLayout === "stage" ? "bg-sky-300 text-[#07142c]" : "text-white hover:bg-white/10")}>Palco</button>
                <button type="button" onClick={() => void copyLiveLink()} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10">Partilhar</button>
              </div>
              {liveReactions.length > 0 && <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex items-end justify-center gap-4">{liveReactions.slice(-5).map((reaction, index) => <span key={reaction.id} title={reaction.name} className="zion-live-reaction flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-white/20 to-sky-300/10 text-3xl shadow-[0_0_32px_rgba(125,211,252,0.28)] backdrop-blur" style={{ animationDelay: (index * 90) + "ms" }}>{reaction.emoji}</span>)}</div>}
              {camera && connected && <div className="absolute bottom-3 right-3 z-20 h-24 w-36 overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-2xl sm:h-32 sm:w-48"><video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" /><span className="absolute bottom-1 left-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">{roomRef.current?.localParticipant.name || "Tu"} · Tu</span></div>}
              {!connected && <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 text-center text-sm text-slate-300">{error || (starting ? "A preparar áudio e vídeo…" : "A ligação foi interrompida.")}</div>}
            </div>
            {connected && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="text-xs font-semibold text-slate-400">Reações ao vivo</span><div className="flex flex-wrap gap-1.5">{["👏", "❤️", "🙏", "🔥", "✨", "🙌"].map((emoji) => <button key={emoji} type="button" onClick={() => void sendReaction(emoji)} aria-label={"Enviar reação " + emoji} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-lg transition hover:-translate-y-0.5 hover:border-sky-300/40 hover:bg-sky-300/10">{emoji}</button>)}</div></div>}
            {notice && <div role="status" className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">{notice}<button onClick={() => setNotice(null)} className="ml-3 underline">Fechar</button></div>}
            {error && connected && <div role="alert" className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
              <button onClick={() => void toggleMicrophone()} disabled={!connected} aria-pressed={microphone} className={"rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-40 " + (microphone ? "border-sky-200/30 bg-sky-300/15 text-sky-100" : "border-white/10 bg-white/5 text-slate-300")}>{microphone ? "🎙 Microfone ligado" : "🔇 Microfone desligado"}</button>
              <button onClick={() => void toggleCamera()} disabled={!connected} aria-pressed={camera} className={"rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-40 " + (camera ? "border-sky-200/30 bg-sky-300/15 text-sky-100" : "border-white/10 bg-white/5 text-slate-300")}>{camera ? "▣ Câmara ligada" : "▧ Câmara desligada"}</button>
              <button onClick={() => void toggleScreenShare()} disabled={!connected} aria-pressed={screenShare} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-40">{screenShare ? "Parar partilha" : "Partilhar ecrã + áudio"}</button>
              {connected && (cameraDevices.length > 0 || microphoneDevices.length > 0) && <div className="flex w-full flex-wrap gap-2 rounded-xl border border-white/10 bg-black/15 p-3">
                {cameraDevices.length > 0 && <label className="min-w-[180px] flex-1 text-[11px] font-semibold text-slate-400">Câmara deste dispositivo
                  <select value={selectedCameraId} onChange={(event) => void changeCameraDevice(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#08152f] px-2 py-2 text-xs text-white">
                    {cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Câmara " + (index + 1)}</option>)}
                  </select>
                </label>}
                {microphoneDevices.length > 0 && <label className="min-w-[180px] flex-1 text-[11px] font-semibold text-slate-400">Microfone deste dispositivo
                  <select value={selectedMicrophoneId} onChange={(event) => void changeMicrophoneDevice(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#08152f] px-2 py-2 text-xs text-white">
                    {microphoneDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microfone " + (index + 1)}</option>)}
                  </select>
                </label>}
                <button type="button" onClick={() => void refreshMediaDevices()} className="self-end rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10">Atualizar dispositivos</button>
              </div>}
              {!isHost && <button onClick={() => void raiseHand()} disabled={!connected || handRaised} className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{handRaised ? "✋ Mão levantada" : "✋ Pedir a palavra"}</button>}
              {isHost && <button onClick={() => void endLive()} disabled={ending} className="rounded-xl border border-rose-300/20 bg-rose-500/[0.07] px-3 py-2.5 text-xs font-semibold text-rose-200/90 transition hover:bg-rose-500/15 disabled:opacity-50">{ending ? "A encerrar…" : "Encerrar live"}</button>}
            </div>
            {isHost && <div className="rounded-2xl border border-white/10 bg-black/10 p-3"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Ferramentas do anfitrião</p>{hostControls}</div>}
          </section>

          <aside className="flex min-h-0 flex-col border-t border-white/10 bg-white/[0.035] lg:border-l lg:border-t-0">
            <div className="grid grid-cols-2 border-b border-white/10">
              <button onClick={() => setTab("chat")} className={"px-4 py-4 text-sm font-semibold " + (tab === "chat" ? "border-b-2 border-sky-300 text-white" : "text-slate-400")}>Chat ao vivo</button>
              <button onClick={() => setTab("people")} className={"px-4 py-4 text-sm font-semibold " + (tab === "people" ? "border-b-2 border-sky-300 text-white" : "text-slate-400")}>Pessoas ({participants.length})</button>
            </div>

            {tab === "chat" ? (
              <>
                <div className="border-b border-white/10 p-3">
                  <button type="button" onClick={() => void shareBibleChallenge()} disabled={!connected} className="w-full rounded-xl border border-[#e2c477]/30 bg-[#e2c477]/10 px-3 py-2.5 text-left text-xs font-semibold text-[#f0d996] transition hover:bg-[#e2c477]/15 disabled:cursor-not-allowed disabled:opacity-50">
                    ✦ Convidar para o Bible Challenge
                  </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length ? messages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <span className="font-semibold text-sky-200">{message.name}: </span>
                      <span className="break-words text-slate-200">{renderLinkedText(message.text)}</span>
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
                {(isHost || isModerator) && raisedHands.length > 0 && <div className="mb-4 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-200">Pedidos para falar</p>
                  {raisedHands.map((person) => <div key={person.identity} className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/10 p-2 text-sm text-white">
                    <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="text-xl">✋</span><span className="truncate">{person.name}</span></span>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => void moderate(person.identity, "allow_speak")} className="rounded-lg bg-sky-300 px-2 py-1.5 text-xs font-bold text-[#07142c]">Autorizar</button>
                      <button onClick={() => setRaisedHands((current) => current.filter((item) => item.identity !== person.identity))} aria-label={"Fechar pedido de " + person.name} className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10">Fechar</button>
                    </div>
                  </div>)}
                </div>}
                {participants.map((person) => (
                  <div key={person.identity} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm text-white">
                    <div className="min-w-0"><p className="truncate font-medium">{person.name}</p><p className="text-xs text-slate-500">{person.identity === selfIdentity ? "Este dispositivo" : isHost ? "Participante" : "Na live"}</p></div>
                    {(isHost || isModerator) && person.identity !== selfIdentity && person.identity !== (roomRef.current?.localParticipant.identity || "") && <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <button title="Autorizar a falar" onClick={() => void moderate(person.identity, "allow_speak")} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Falar</button>
                      <button title="Retirar permissão de falar" onClick={() => void moderate(person.identity, "revoke_speak")} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Silenciar</button>
                      <button title="Remover da live" onClick={() => void moderate(person.identity, "remove")} className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-200">Remover</button>
                      {isHost && <button title="Delegar ou retirar moderação" onClick={() => void toggleModerator(person.identity)} className={"rounded-lg px-2 py-1 text-xs " + (moderatorIds.includes(person.identity) ? "bg-amber-300/20 text-amber-100" : "bg-white/10 text-slate-200")}>{moderatorIds.includes(person.identity) ? "Retirar moderador" : "Tornar moderador"}</button>}
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
