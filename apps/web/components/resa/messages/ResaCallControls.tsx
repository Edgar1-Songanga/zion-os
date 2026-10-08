"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CallKind = "audio" | "video";
type CallRow = { id:string; conversation_id:string; initiator_id:string; kind:CallKind; status:string };

export default function ResaCallControls({ conversationId }: { conversationId: string }) {
  const supabase = createClient();
  const [call, setCall] = useState<CallRow|null>(null);
  const [incoming, setIncoming] = useState<CallRow|null>(null);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const pc = useRef<RTCPeerConnection|null>(null);
  const localStream = useRef<MediaStream|null>(null);
  const remoteStream = useRef<MediaStream|null>(null);
  const localVideo = useRef<HTMLVideoElement|null>(null);
  const remoteVideo = useRef<HTMLVideoElement|null>(null);
  const userId = useRef<string|null>(null);
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({data}) => { if(mounted) userId.current=data.user?.id??null; });
    return () => { mounted=false; };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("resa-call-events-"+conversationId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"resa_calls",filter:"conversation_id=eq."+conversationId},payload=>{
        const next=payload.new as CallRow;
        if(next.initiator_id!==userId.current && next.status==="ringing") setIncoming(next);
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"resa_call_signals"},payload=>{
        const signal=payload.new as {call_id:string;sender_id:string;recipient_id:string;kind:string;payload:any};
        if(signal.recipient_id===userId.current && (call?.id===signal.call_id || incoming?.id===signal.call_id)) void handleSignal(signal);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, call?.id]);

  async function members() {
    const {data,error:e}=await supabase.from("resa_conversation_members").select("user_id").eq("conversation_id",conversationId);
    if(e) throw e;
    return (data??[]).map(x=>x.user_id).filter(id=>id!==userId.current);
  }

  async function setup(kind:CallKind) {
    setError(null);
    if(!navigator.mediaDevices?.getUserMedia){setError("O navegador não suporta chamadas WebRTC.");return;}
    const others=await members();
    if(!others[0]){setError("Esta conversa ainda não tem outro participante disponível.");return;}
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==="video"});
    localStream.current=stream;
    if(localVideo.current){localVideo.current.srcObject=stream;localVideo.current.muted=true;}
    const peer=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});
    pc.current=peer;
    remoteStream.current=new MediaStream();
    if(remoteVideo.current) remoteVideo.current.srcObject=remoteStream.current;
    stream.getTracks().forEach(track=>peer.addTrack(track,stream));
    peer.ontrack=e=>e.streams[0]?.getTracks().forEach(t=>remoteStream.current?.addTrack(t));
    peer.onicecandidate=async e=>{if(e.candidate&&call) await supabase.from("resa_call_signals").insert({call_id:call.id,sender_id:userId.current,recipient_id:others[0],kind:"ice",payload:e.candidate.toJSON()});};
    return {peer,other:others[0]};
  }

  async function start(kind:CallKind) {
    try{
      const others=await members(); if(!others[0]) throw new Error("Não há outro participante disponível.");
      const {data:c,error:e}=await supabase.from("resa_calls").insert({conversation_id:conversationId,initiator_id:userId.current,kind,status:"ringing"}).select().single();
      if(e) throw e;
      setCall(c as CallRow);
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==="video"});
      localStream.current=stream; setActive(true);
      if(localVideo.current){localVideo.current.srcObject=stream;localVideo.current.muted=true;}
      const peer=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});
      pc.current=peer; remoteStream.current=new MediaStream(); if(remoteVideo.current) remoteVideo.current.srcObject=remoteStream.current;
      stream.getTracks().forEach(t=>peer.addTrack(t,stream));
      peer.ontrack=e=>e.streams[0]?.getTracks().forEach(t=>remoteStream.current?.addTrack(t));
      peer.onicecandidate=async e=>{if(e.candidate) await supabase.from("resa_call_signals").insert({call_id:c.id,sender_id:userId.current,recipient_id:others[0],kind:"ice",payload:e.candidate.toJSON()});};
      const offer=await peer.createOffer(); await peer.setLocalDescription(offer);
      await supabase.from("resa_call_signals").insert({call_id:c.id,sender_id:userId.current,recipient_id:others[0],kind:"offer",payload:offer});
    }catch(e){
      const message = e instanceof DOMException && e.name === "NotAllowedError"
        ? "Acesso ao microfone/câmara foi bloqueado. Autorize o acesso nas permissões do navegador e tente novamente."
        : e instanceof DOMException && e.name === "NotFoundError"
          ? "Não foi encontrada uma câmara ou um microfone disponível neste dispositivo."
          : e instanceof Error ? e.message : "Não foi possível iniciar a chamada.";
      setError(message);
    }
  }

  async function accept() {
    if(!incoming) return;
    try{
      setError(null); setCall(incoming); setIncoming(null); setActive(true);
      const others=await members(); const initiator=incoming.initiator_id;
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:incoming.kind==="video"});
      localStream.current=stream; if(localVideo.current){localVideo.current.srcObject=stream;localVideo.current.muted=true;}
      const peer=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});
      pc.current=peer; remoteStream.current=new MediaStream(); if(remoteVideo.current) remoteVideo.current.srcObject=remoteStream.current;
      stream.getTracks().forEach(t=>peer.addTrack(t,stream));
      peer.ontrack=e=>e.streams[0]?.getTracks().forEach(t=>remoteStream.current?.addTrack(t));
      peer.onicecandidate=async e=>{if(e.candidate) await supabase.from("resa_call_signals").insert({call_id:incoming.id,sender_id:userId.current,recipient_id:initiator,kind:"ice",payload:e.candidate.toJSON()});};
      const {data:offer}=await supabase.from("resa_call_signals").select("*").eq("call_id",incoming.id).eq("kind","offer").eq("recipient_id",userId.current).order("created_at",{ascending:false}).limit(1).single();
      if(!offer) throw new Error("Oferta de chamada não encontrada.");
      await peer.setRemoteDescription(offer.payload);
      const answer=await peer.createAnswer(); await peer.setLocalDescription(answer);
      await supabase.from("resa_call_signals").insert({call_id:incoming.id,sender_id:userId.current,recipient_id:initiator,kind:"answer",payload:answer});
      await supabase.from("resa_call_participants").upsert({call_id:incoming.id,user_id:userId.current,status:"joined",joined_at:new Date().toISOString()},{onConflict:"call_id,user_id"});
      await supabase.from("resa_calls").update({status:"active",answered_at:new Date().toISOString()}).eq("id",incoming.id);
    }catch(e){
      const message = e instanceof DOMException && e.name === "NotAllowedError"
        ? "Acesso ao microfone/câmara foi bloqueado. Autorize a permissão para atender a chamada."
        : e instanceof Error ? e.message : "Não foi possível atender a chamada.";
      setError(message);
    }
  }

  async function handleSignal(signal:any) {
    const peer=pc.current; if(!peer) return;
    try{
      if(signal.kind==="answer"){\n        await peer.setRemoteDescription(signal.payload);\n        const queued = pendingIce.current.get(signal.call_id) ?? [];\n        for (const candidate of queued) await peer.addIceCandidate(candidate);\n        pendingIce.current.delete(signal.call_id);\n      }
      if(signal.kind==="ice"&&signal.payload){\n        if(peer.remoteDescription) await peer.addIceCandidate(signal.payload);\n        else { const queue=pendingIce.current.get(signal.call_id) ?? []; queue.push(signal.payload); pendingIce.current.set(signal.call_id, queue); }\n      }
    }catch(e){setError(e instanceof Error?e.message:"Falha na negociação da chamada.");}
  }

  async function end() {
    const id=call?.id;
    pc.current?.close(); pc.current=null; localStream.current?.getTracks().forEach(t=>t.stop()); localStream.current=null; remoteStream.current=null;
    if(id) await supabase.from("resa_calls").update({status:"ended",ended_at:new Date().toISOString()}).eq("id",id);
    setCall(null);setActive(false);setIncoming(null);
  }

  function toggleMute(){const tracks=localStream.current?.getAudioTracks()??[];tracks.forEach(t=>t.enabled=!t.enabled);setMuted(v=>!v);}
  function toggleCamera(){const tracks=localStream.current?.getVideoTracks()??[];tracks.forEach(t=>t.enabled=!t.enabled);setCamera(v=>!v);}

  return <div className="flex items-center gap-2">
    <button onClick={()=>{setError(null);void start("audio");}} aria-label="Iniciar chamada de áudio" title="Chamada de áudio" className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0C1A3D] shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md">
      <span className="text-base" aria-hidden="true">☎</span><span className="hidden sm:inline">Áudio</span>
    </button>
    <button onClick={()=>{setError(null);void start("video");}} aria-label="Iniciar videochamada" title="Videochamada" className="flex h-10 items-center gap-2 rounded-xl bg-[#0C1A3D] px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#122858] hover:shadow-md">
      <span className="text-base" aria-hidden="true">▣</span><span className="hidden sm:inline">Vídeo</span>
    </button>
    {error&&<span role="alert" className="max-w-[240px] text-xs text-red-600">{error}</span>}
    {incoming&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#061127]/60 p-4 backdrop-blur-md"><div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Chamada recebida</p><h3 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{incoming.kind==="video"?"Videochamada":"Chamada de áudio"}</h3><div className="mt-6 flex gap-3"><button onClick={()=>setIncoming(null)} className="flex-1 rounded-2xl border px-4 py-3 font-semibold">Recusar</button><button onClick={()=>void accept()} className="flex-1 rounded-2xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white">Atender</button></div></div></div>}
    {active&&<div className="fixed inset-0 z-[60] bg-[#020817]/95 p-3 backdrop-blur-md sm:p-5"><div className="mx-auto flex h-full max-w-6xl flex-col"><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Comunicação segura</p><p className="mt-1 font-semibold">{call?.kind==="video"?"Videochamada":"Chamada de áudio"}</p></div><button onClick={()=>void end()} className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold shadow-lg transition hover:bg-red-500">Terminar</button></div><div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-slate-900"><video ref={remoteVideo} autoPlay playsInline className={call?.kind==="video"?"h-full w-full object-cover":"hidden"}/><video ref={localVideo} autoPlay playsInline className={call?.kind==="video"?"absolute bottom-5 right-5 h-32 w-52 rounded-2xl border-2 border-white/20 object-cover shadow-2xl":"hidden"}/>{call?.kind==="audio"&&<div className="flex h-full items-center justify-center text-6xl text-white/80">☎</div>}</div><div className="mt-4 flex justify-center gap-3"><button onClick={toggleMute} aria-label={muted?"Ativar microfone":"Silenciar microfone"} className={"rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition " + (muted?"bg-red-500/80":"bg-white/10 hover:bg-white/15")}>{muted?"🔇 Ativar":"🎙 Silenciar"}</button>{call?.kind==="video"&&<button onClick={toggleCamera} aria-label={camera?"Desligar câmara":"Ligar câmara"} className={"rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition " + (camera?"bg-white/10 hover:bg-white/15":"bg-red-500/80")}>{camera?"📷 Câmara":"🚫 Câmara"}</button>}</div></div></div>}
  </div>;
}