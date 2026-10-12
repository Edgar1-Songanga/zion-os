"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { spiritualSearch } from "@/services/spiritual-chat";
import { resaRequest } from "@/lib/resa/api";

type SpiritualResponse = ReturnType<typeof spiritualSearch>;
type BiblePassage = { reference: { book: string; chapter: number; verseStart?: number; verseEnd?: number }; text: string; verses?: string[]; translation: string; copyright?: string };

export default function SpiritualChat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<SpiritualResponse | null>(null);
  const [passages, setPassages] = useState<BiblePassage[]>([]);
  const [loading, setLoading] = useState(false);
  const [passageNotice, setPassageNotice] = useState<string | null>(null);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = message.trim();
    if (!question || loading) return;
    const answer = spiritualSearch(question);
    setResponse(answer);
    setPassages([]);
    setPassageNotice(null);
    if (!answer.references.length) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        answer.references.slice(0, 4).map(async (reference) => {
          const found = await resaRequest<BiblePassage[]>(
            `/v1/spiritual/bible/search?q=${encodeURIComponent(reference)}&translation=almeida-livre`,
          );
          return found[0];
        }),
      );
      const available = results.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        const passage = result.value;
        return passage && (passage.text || passage.verses?.length) ? [passage] : [];
      });
      setPassages(available);
      if (!available.length) setPassageNotice("A resposta inclui referências bíblicas, mas não foi possível carregar o texto dos versículos neste momento.");
    } catch {
      setPassageNotice("A resposta inclui referências bíblicas. O texto integral das passagens não ficou disponível nesta consulta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative isolate w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_90px_-35px_rgba(12,26,61,0.38)]">
      <div className="relative overflow-hidden bg-[#0B1735] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-[#D9BD78]/25" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9BD78]/35 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E7D5A6]"><span className="h-1.5 w-1.5 rounded-full bg-[#D9BD78]" /> ZION · Crescimento espiritual</div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Um espaço para refletir na Palavra.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Explore temas bíblicos, encontre passagens e aprofunde o seu estudo com clareza e reverência.</p>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4 md:block"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Princípio</p><p className="mt-2 text-sm font-medium text-[#E7D5A6]">Escritura primeiro</p><p className="mt-1 text-xs text-slate-400">Referências antes de conclusões</p></div>
        </div>
      </div>
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="mb-5"><h3 className="text-lg font-semibold tracking-tight text-[#0C1A3D]">O que gostaria de estudar?</h3><p className="mt-1 text-sm text-slate-500">Escreva uma pergunta específica. As respostas disponíveis podem incluir referências bíblicas para verificação.</p></div>

      <form onSubmit={(event) => send(event)} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={500}
          placeholder="Ex.: O que diz a Bíblia sobre o sábado?"
          aria-label="A tua pergunta espiritual"
          className="min-h-14 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#B99A52] focus:bg-white focus:ring-4 focus:ring-[#B99A52]/10"
        />
        <button type="submit" disabled={!message.trim() || loading} className="min-h-14 rounded-2xl bg-[#0C1A3D] px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-[#0C1A3D]/15 transition hover:bg-[#152954] focus:outline-none focus:ring-4 focus:ring-[#B99A52]/20 disabled:cursor-not-allowed disabled:opacity-50">
          Pesquisar
        </button>
      </form>

      {response && (
        <div aria-live="polite" className="mt-8 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-[var(--zion-dark)]">{response.title}</h3>
            <span className="rounded-full border border-[var(--zion-border)] bg-white px-3 py-1 text-xs text-[var(--zion-muted)]">{response.intent === "bible" ? "Estudo bíblico" : response.intent === "prayer" ? "Oração" : response.intent === "sabbath_school" ? "Escola Sabatina" : "Estudo espiritual"}</span>
          </div>
          <p className="mt-4 whitespace-pre-line leading-7 text-[var(--zion-dark)]">{response.answer}</p>

          {response.references.length > 0 && (
            <div className="mt-5 rounded-xl border border-[var(--zion-border)] bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--zion-dark)]">Passagens para consultar</p>
              {response.references.map((reference) => <p key={reference} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{reference}</p>)}
            </div>
          )}
          {passages.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-[var(--zion-dark)]">Texto bíblico consultado · {passages[0].translation}</p>
              {passages.map((passage, index) => (
                <article key={passage.reference.book + passage.reference.chapter + "-" + index} className="rounded-xl border border-[var(--zion-border)] bg-white p-4">
                  <h4 className="mb-2 font-semibold text-[var(--zion-primary)]">{passage.reference.book} {passage.reference.chapter}{passage.reference.verseStart ? ":" + passage.reference.verseStart + (passage.reference.verseEnd && passage.reference.verseEnd !== passage.reference.verseStart ? "–" + passage.reference.verseEnd : "") : ""}</h4>
                  {passage.verses?.length ? passage.verses.map((verse, verseIndex) => <p key={verseIndex} className="mb-2 text-sm leading-6 text-[var(--zion-dark)]">{verse}</p>) : <p className="text-sm leading-6 text-[var(--zion-dark)]">{passage.text}</p>}
                  {passage.copyright && <p className="mt-2 text-xs text-[var(--zion-muted)]">{passage.copyright}</p>}
                </article>
              ))}
            </div>
          )}
          {passageNotice && <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-[var(--zion-muted)]">{passageNotice}</p>}

          {response.nextSteps.length > 0 && (
            <div className="mt-5">
              <p className="font-semibold text-[var(--zion-dark)]">Próximos passos</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--zion-muted)]">
                {response.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
          </div>
    </section>
  );
}
