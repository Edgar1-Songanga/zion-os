"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

const TYPES = [
  ["article", "Artigo"], ["bible_study", "Estudo bíblico"], ["video", "Vídeo"], ["sermon", "Sermão"], ["music", "Música"],
] as const;

export default function ContentCreator() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number][0]>("article");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function publish() {
    if (title.trim().length < 2 && body.trim().length < 2) { setStatus("error"); setMessage("Adicione um título ou conteúdo."); return; }
    setStatus("saving"); setMessage("");
    try {
      await resaRequest("/v1/resa/content", { method: "POST", body: JSON.stringify({ title: title.trim() || null, body: body.trim() || null, type, visibility: "public", language: "pt" }) });
      setStatus("success"); setMessage("Conteúdo publicado.");
      setTitle(""); setBody("");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Não foi possível publicar o conteúdo."); }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Creator</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Criar conteúdo</h2>
      <div className="mt-6 grid gap-4">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0C1A3D] focus:ring-4 focus:ring-blue-100" />
        <select value={type} onChange={e=>setType(e.target.value as typeof type)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">{TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Conteúdo" rows={7} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0C1A3D] focus:ring-4 focus:ring-blue-100" />
      </div>
      {message && <p role={status==="error"?"alert":"status"} className={`mt-4 rounded-2xl p-3 text-sm ${status==="error"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{message}</p>}
      <button disabled={status==="saving"} onClick={()=>void publish()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60">{status==="saving"?"A publicar…":"Publicar"}</button>
    </section>
  );
}