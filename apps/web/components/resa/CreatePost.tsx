"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "./core/ResaIcon";

const types = [
  { value: "text", label: "Publicação", icon: "sparkles" },
  { value: "prayer", label: "Oração", icon: "prayer" },
  { value: "bible_study", label: "Estudo bíblico", icon: "story" },
] as const;

export default function CreatePost({ onPublished }: { onPublished?: () => void }) {
  const [body, setBody] = useState("");
  const [type, setType] = useState<"text" | "prayer" | "bible_study">("text");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({
          type,
          body: body.trim(),
          visibility: "public",
          language: "pt",
        }),
      });
      setBody("");
      setType("text");
      onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Partilhar</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">O que deseja partilhar?</h2>
          </div>
          <span className="hidden rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:block">Comunidade global</span>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva uma mensagem, testemunho, reflexão ou pedido de oração…"
          className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-[15px] leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C1A3D]/30 focus:bg-white focus:ring-4 focus:ring-[#0C1A3D]/5"
          maxLength={10000}
        />

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {types.map((item) => {
              const active = type === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setType(item.value)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "border-[#0C1A3D] bg-[#0C1A3D] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <ResaIcon name={item.icon} size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void publish()}
            disabled={saving || !body.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0C1A3D] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ResaIcon name="send" size={15} />
            {saving ? "A publicar…" : "Publicar"}
          </button>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
