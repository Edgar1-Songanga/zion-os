"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type BibleResult = {
  reference: { book: string; chapter: number; verseStart?: number; verseEnd?: number };
  text: string;
  translation: string;
  copyright?: string;
};

export default function BibleSearch() {
  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState("almeida-livre");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const results = await resaRequest<BibleResult[]>(
        `/v1/spiritual/bible/search?q=${encodeURIComponent(value)}&translation=${encodeURIComponent(translation)}`,
      );
      if (!results[0]) {
        setError("Referência não encontrada. Experimente, por exemplo, João 3:16 ou Salmos 23.");
      } else {
        setResult(results[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar a Bíblia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0C1A3D]">Bíblia</h2>
          <p className="mt-2 text-slate-500">
            Texto bíblico proveniente de uma fonte aberta, com licença indicada junto do conteúdo.
          </p>
        </div>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          aria-label="Versão bíblica"
        >
          <option value="almeida-livre">Almeida 1819 — domínio público</option>
          <option value="kjv">King James Version — domínio público</option>
          <option value="web">World English Bible — domínio público</option>
        </select>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void search();
          }}
          placeholder="Ex.: João 3:16 ou Salmos 23"
          className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-[#0C1A3D] focus:ring-2 focus:ring-slate-200"
          aria-label="Referência bíblica"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || !query.trim()}
          className="rounded-xl bg-[#0C1A3D] px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "A consultar…" : "Consultar"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

      {result && (
        <article className="mt-6 rounded-2xl bg-slate-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {result.reference.book} {result.reference.chapter}
            {result.reference.verseStart ? `:${result.reference.verseStart}${result.reference.verseEnd ? `-${result.reference.verseEnd}` : ""}` : ""}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-slate-800">{result.text}</p>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
            Fonte: Midvash Bible API · {result.translation}
            {result.copyright ? ` · ${result.copyright}` : ""}
          </p>
        </article>
      )}
    </section>
  );
}
