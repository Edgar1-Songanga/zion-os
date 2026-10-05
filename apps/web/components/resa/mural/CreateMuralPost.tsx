"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function CreateMuralPost() {
  const [content,setContent]=useState(""); const [status,setStatus]=useState<"idle"|"saving"|"success"|"error">("idle"); const [message,setMessage]=useState("");
  async function publishPost(){if(!content.trim()){setStatus("error");setMessage("Escreva uma mensagem antes de publicar.");return;}setStatus("saving");setMessage("");try{await resaRequest("/v1/resa/content",{method:"POST",body:JSON.stringify({type:"spiritual_post",body:content.trim(),visibility:"public",language:"pt"})});setStatus("success");setMessage("Publicação criada no Mural.");setContent("");}catch(e){setStatus("error");setMessage(e instanceof Error?e.message:"Não foi possível publicar.");}}
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Mural</p><h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Criar publicação</h2><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Partilhe uma mensagem, testemunho ou reflexão…" rows={6} className="mt-6 w-full rounded-2xl border border-slate-200 p-4"/>{message&&<p role={status==="error"?"alert":"status"} className={`mt-4 rounded-2xl p-3 text-sm ${status==="error"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{message}</p>}<button disabled={status==="saving"} onClick={()=>void publishPost()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{status==="saving"?"A publicar…":"Publicar"}</button></section>;
}