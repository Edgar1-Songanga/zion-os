"use client";

import { useState } from "react";
import ResaIcon from "@/components/resa/core/ResaIcon";
import { resaRequest } from "@/lib/resa/api";

export default function PrayerRequestForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("community");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await resaRequest("/v1/resa/prayer", { method: "POST", body: JSON.stringify({ title, body, visibility }) });
      setTitle(""); setBody("");
      setFeedback("O seu pedido foi publicado com segurança.");
      onCreated?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível publicar o pedido.");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C1A3D] text-white shadow-lg"><ResaIcon name="prayer" size={20} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Espaço de intercessão</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">Partilhe um pedido</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Permita que pessoas da sua comunidade estejam consigo em oração.</p>
        </div>
      </div>
      <label className="mt-6 block text-sm font-semibold text-slate-700">Título
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required placeholder="Por aquilo que gostaria de pedir oração?" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-[#0C1A3D] focus:bg-white" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-700">Pedido
        <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={5000} required placeholder="Escreva o seu pedido de oração..." className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 outline-none focus:border-[#0C1A3D] focus:bg-white" />
      </label>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold text-slate-700">Visibilidade
          <select value={visibility} onChange={e => setVisibility(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">
            <option value="community">Comunidade RESA</option><option value="public">Público</option><option value="private">Somente eu</option><option value="organization">Organização</option>
          </select>
        </label>
        <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0C1A3D] px-5 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"><ResaIcon name="send" size={16} />{submitting ? "A publicar..." : "Publicar pedido"}</button>
      </div>
      {feedback && <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600" role="status">{feedback}</p>}
    </form>
  );
}