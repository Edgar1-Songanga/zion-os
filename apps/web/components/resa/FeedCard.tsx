"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type ResaContent = { id: string; author_id: string; type: string; title?: string | null; body?: string | null; visibility: string; language: string; created_at: string; };

export default function FeedCard({ content }: { content: ResaContent }) {
  const [reaction, setReaction] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggleReaction() {
    try {
      if (reaction) {
        await resaRequest(`/v1/resa/content/${content.id}/reactions`, { method: "DELETE" });
        setReaction(false);
      } else {
        await resaRequest(`/v1/resa/content/${content.id}/reactions`, { method: "POST", body: JSON.stringify({ reaction_type: "like" }) });
        setReaction(true);
      }
    } catch {}
  }

  async function save() {
    setSaving(true);
    try { await resaRequest(`/v1/resa/content/${content.id}/save`, { method: "POST" }); } catch {}
    setSaving(false);
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0C1A3D] font-bold text-white">Z</div>
        <div><h3 className="font-bold">ZION Member</h3><p className="text-sm text-slate-500">{new Date(content.created_at).toLocaleString("pt-PT")}</p></div>
      </div>
      <div className="mt-6">{content.title && <h4 className="font-semibold text-[#0C1A3D]">{content.title}</h4>}<p className="whitespace-pre-wrap text-slate-700">{content.body}</p></div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={toggleReaction} className={`rounded-xl px-4 py-2 ${reaction ? "bg-slate-200" : "bg-slate-100"}`}>👍 {reaction ? "Gostei" : "Curtir"}</button>
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2">{saving ? "…" : "🔖 Guardar"}</button>
        <button type="button" className="rounded-xl bg-slate-100 px-4 py-2">💬 Comentar</button>
        <button type="button" className="rounded-xl bg-slate-100 px-4 py-2">↗ Repostar</button>
      </div>
    </article>
  );
}
