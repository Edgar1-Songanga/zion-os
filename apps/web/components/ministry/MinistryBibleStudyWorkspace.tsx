"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type BibleResult = {
  reference: { book: string; chapter: number; verseStart?: number; verseEnd?: number };
  text: string;
  translation: string;
};

type Props = {
  ministryId: string;
  organizationId?: string;
  ministryName: string;
};

function formatReference(result: BibleResult) {
  const { book, chapter, verseStart, verseEnd } = result.reference;
  const verses = verseStart ? verseEnd && verseEnd !== verseStart ? `:${verseStart}-${verseEnd}` : `:${verseStart}` : "";
  return `${book} ${chapter}${verses}`;
}

export default function MinistryBibleStudyWorkspace({ ministryId, organizationId, ministryName }: Props) {
  const [query, setQuery] = useState("");
  const [passage, setPassage] = useState<BibleResult | null>(null);
  const [references, setReferences] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"organization" | "public" | "private">("organization");
  const [searching, setSearching] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function searchPassage() {
    const value = query.trim();
    if (value.length < 2 || searching) return;
    setSearching(true);
    setError("");
    setMessage("");
    try {
      const results = await resaRequest<BibleResult[]>(
        `/v1/spiritual/bible/search?q=${encodeURIComponent(value)}&translation=almeida-livre`,
      );
      if (!results[0]) {
        setPassage(null);
        setError("A referência não foi encontrada. Confirme o livro, capítulo e versículo.");
        return;
      }
      setPassage(results[0]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o Bible Engine.");
    } finally {
      setSearching(false);
    }
  }

  function addReference() {
    if (!passage) return;
    const reference = formatReference(passage);
    setReferences((current) => current.includes(reference) ? current : [...current, reference]);
    setError("");
  }

  async function publishStudy() {
    if (!title.trim() || !body.trim() || references.length === 0 || publishing) {
      setError("Preencha o título, o conteúdo e associe pelo menos uma referência bíblica.");
      return;
    }
    if (visibility === "organization" && !organizationId) {
      setError("Este ministério não tem uma organização associada. Não é possível publicar com visibilidade organizacional.");
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");
    try {
      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({
          type: "bible_study",
          title: title.trim(),
          body: body.trim(),
          visibility,
          language: "pt",
          organization_id: organizationId ?? null,
          ministry_id: ministryId,
          scripture_references: references,
        }),
      });
      setMessage("Estudo bíblico publicado e associado ao ministério no RESA.");
      setTitle("");
      setBody("");
      setReferences([]);
      setPassage(null);
      setQuery("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível publicar o estudo bíblico.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D4AF37]/30 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F16]">Bible Engine × RESA</p>
      <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Preparar estudo bíblico</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Consulte uma passagem no Bible Engine e publique um estudo ligado a {ministryName}. O registo é enviado para o RESA com o identificador deste ministério e as referências escolhidas.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="ministry-bible-reference">Referência bíblica</label>
        <input
          id="ministry-bible-reference"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchPassage(); } }}
          placeholder="Ex.: João 3:16 ou Salmos 23"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20"
        />
        <button type="button" onClick={() => void searchPassage()} disabled={searching || query.trim().length < 2} className="rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {searching ? "A pesquisar…" : "Pesquisar no Bible Engine"}
        </button>
      </div>

      {passage && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#0C1A3D]">{formatReference(passage)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{passage.text}</p>
              <p className="mt-2 text-xs text-slate-400">Tradução: {passage.translation}</p>
            </div>
            <button type="button" onClick={addReference} className="shrink-0 rounded-lg border border-[#C8A24A]/50 bg-white px-3 py-2 text-xs font-semibold text-[#0C1A3D]">
              Associar referência
            </button>
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#0C1A3D]">Referências associadas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {references.map((reference) => (
              <span key={reference} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                {reference}
                <button type="button" aria-label={`Remover ${reference}`} onClick={() => setReferences((current) => current.filter((item) => item !== reference))} className="font-bold text-slate-500 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <label className="block text-sm font-medium text-slate-700">Título do estudo
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Conteúdo e perguntas para reflexão
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={10000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Visibilidade
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <option value="organization" disabled={!organizationId}>Organização do ministério</option>
            <option value="public">Público no RESA</option>
            <option value="private">Privado</option>
          </select>
        </label>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button type="button" onClick={() => void publishStudy()} disabled={publishing || !title.trim() || !body.trim() || references.length === 0} className="mt-5 rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#182c58] disabled:cursor-not-allowed disabled:opacity-50">
        {publishing ? "A publicar…" : "Publicar estudo no RESA"}
      </button>
      <p className="mt-3 text-xs leading-5 text-slate-500">Este fluxo publica conteúdo de estudo no RESA; não regista presença, acompanhamento individual ou resultados oficiais do ministério.</p>
    </section>
  );
}
