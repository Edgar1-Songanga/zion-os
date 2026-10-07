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
    <section className="rounded-3xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-8">
      <div className="h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--zion-primary)]">Bíblia</h2>
          <p className="mt-2 text-[var(--zion-muted)]">
            Texto bíblico proveniente de uma fonte aberta, com licença indicada junto do conteúdo.
          </p>
        </div>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          className="rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm text-[var(--zion-dark)] shadow-[var(--zion-shadow-sm)] outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10"
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
          className="min-h-12 flex-1 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] px-4 text-[var(--zion-dark)] outline-none focus:border-[var(--zion-sky)] focus:bg-white focus:ring-4 focus:ring-[var(--zion-sky)]/10"
          aria-label="Referência bíblica"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || !query.trim()}
          className="rounded-xl bg-[var(--zion-primary)] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50"
        >
          {loading ? "A consultar…" : "Consultar"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {result && (
        <article className="mt-6 rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--zion-muted)]">
            {result.reference.book} {result.reference.chapter}
            {result.reference.verseStart ? `:${result.reference.verseStart}${result.reference.verseEnd ? `-${result.reference.verseEnd}` : ""}` : ""}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[var(--zion-dark)]">{result.text}</p>
          <p className="mt-5 border-t border-[var(--zion-border)] pt-4 text-xs text-[var(--zion-muted)]">
            Fonte: Midvash Bible API · {result.translation}
            {result.copyright ? ` · ${result.copyright}` : ""}
          </p>
        </article>
      )}
    </section>
  );
}
