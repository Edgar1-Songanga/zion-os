"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function LiveCreate() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function createLive() {
    if (title.trim().length < 2) { setStatus("error"); setMessage("Defina um título para a transmissão."); return; }
    setStatus("saving"); setMessage("");
    try {
      await resaRequest("/v1/resa/live", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          visibility: privacy,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      setStatus("success");
      setMessage("Live criada com sucesso.");
      setTitle(""); setDescription(""); setScheduledAt("");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Não foi possível criar a live.");
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Live</p><h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Criar transmissão</h2><p className="mt-2 text-sm leading-6 text-slate-500">Agende uma sessão real ou prepare-a para iniciar pelo módulo de Live.</p></div>
      </div>
      <div className="mt-6 grid gap-4">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da transmissão" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0C1A3D] focus:ring-4 focus:ring-blue-100" />
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descrição da live" rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0C1A3D] focus:ring-4 focus:ring-blue-100" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Privacidade<select value={privacy} onChange={e=>setPrivacy(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"><option value="public">Pública</option><option value="followers">Seguidores</option><option value="community">Comunidade</option><option value="private">Privada</option></select></label>
          <label className="text-sm font-medium text-slate-700">Agendar (opcional)<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
        </div>
      </div>
      {message && <p role={status === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl p-3 text-sm ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p>}
      <button disabled={status === "saving"} onClick={() => void createLive()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{status === "saving" ? "A criar…" : "Criar live"}</button>
    </section>
  );
}