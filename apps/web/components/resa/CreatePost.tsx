"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function CreatePost({ onPublished }: { onPublished?: () => void }) {
  const [body, setBody] = useState("");
  const [type, setType] = useState<"text" | "prayer" | "bible_study">("text");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!body.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({ type, body: body.trim(), visibility: "public", language: "pt" }),
      });
      setBody(""); onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0C1A3D]">Criar publicação</h2>
      <textarea value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Partilhe uma mensagem, testemunho ou reflexão…"
        className="mt-5 h-32 w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-[#0C1A3D]"
        maxLength={10000} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setType("prayer")} className={`rounded-xl px-4 py-2 ${type === "prayer" ? "bg-slate-200" : "bg-slate-100"}`}>🙏 Oração</button>
          <button type="button" onClick={() => setType("bible_study")} className={`rounded-xl px-4 py-2 ${type === "bible_study" ? "bg-slate-200" : "bg-slate-100"}`}>📖 Estudo</button>
        </div>
        <button type="button" onClick={publish} disabled={saving || !body.trim()} className="rounded-xl bg-[#0C1A3D] px-6 py-2 text-white disabled:opacity-50">
          {saving ? "A publicar…" : "Publicar"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
