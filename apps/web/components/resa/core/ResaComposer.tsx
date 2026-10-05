"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function ResaComposer() {
  const [type, setType] = useState("post");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function publish() {
    if (type !== "post") {
      setStatus("error");
      setMessage("Este compositor mantém os fluxos especializados: use o Centro de Oração, Eventos, Live ou Reuniões para criar esses registos com todos os campos e controlos necessários.");
      return;
    }
    if (content.trim().length < 1) { setStatus("error"); setMessage("Escreva algo antes de publicar."); return; }
    setStatus("saving"); setMessage("");
    try {
      await resaRequest("/v1/resa/content", { method: "POST", body: JSON.stringify({ type: "text", title: title.trim() || null, body: content.trim(), visibility: "public", language: "pt" }) });
      setStatus("success"); setMessage("Publicação criada no RESA."); setTitle(""); setContent("");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Não foi possível publicar."); }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA</p><h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Criar no RESA</h2></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Produção</span></div>
      <select value={type} onChange={e=>{setType(e.target.value);setStatus("idle");setMessage("");}} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3"><option value="post">Publicação</option><option value="prayer">Pedido de oração</option><option value="event">Evento</option><option value="live">Live</option><option value="meeting">Reunião</option></select>
      {type === "post" ? <><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título opcional" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3" /><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Partilhe algo com a comunidade…" rows={6} className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3" /></> : <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-slate-700">{message || "Este tipo possui um fluxo especializado para garantir os campos, permissões e validações corretos."}</div>}
      {message && type === "post" && <p role={status==="error"?"alert":"status"} className={`mt-4 rounded-2xl p-3 text-sm ${status==="error"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{message}</p>}
      <button disabled={status==="saving"} onClick={()=>void publish()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60">{type==="post" ? (status==="saving"?"A publicar…":"Publicar") : "Abrir fluxo especializado"}</button>
    </section>
  );
}