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
    <section className="max-w-3xl rounded-3xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-8">
      <div className="h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
      <h2 className="mt-5 text-2xl font-bold tracking-tight text-[var(--zion-primary)]">Assistente bíblico e espiritual</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">
        Faz uma pergunta sobre as Escrituras, oração ou vida espiritual. As respostas disponíveis incluem referências para continuares o estudo.
      </p>

      <form onSubmit={(event) => send(event)} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={500}
          placeholder="Ex.: O que diz a Bíblia sobre o sábado?"
          aria-label="A tua pergunta espiritual"
          className="min-w-0 flex-1 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4 text-[var(--zion-dark)] outline-none transition focus:border-[var(--zion-sky)] focus:bg-white focus:ring-4 focus:ring-[var(--zion-sky)]/10"
        />
        <button type="submit" disabled={!message.trim() || loading} className="rounded-xl bg-[var(--zion-primary)] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:cursor-not-allowed disabled:opacity-50">
          Pesquisar
        </button>
      </form>

      {response && (
        <div aria-live="polite" className="mt-8 rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-[var(--zion-dark)]">{response.title}</h3>
            <span className="rounded-full border border-[var(--zion-border)] bg-white px-3 py-1 text-xs text-[var(--zion-muted)]">{response.intent === "bible" ? "Estudo bíblico" : response.intent === "prayer" ? "Oração" : response.intent === "sabbath_school" ? "Escola Sabatina" : "Estudo espiritual"}</span>
          </div>
          <p className="mt-4 whitespace-pre-line leading-7 text-[var(--zion-dark)]">{response.answer}</p>

          {response.references.length > 0 && (
            <div className="mt-5 rounded-xl border border-[var(--zion-border)] bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--zion-dark)]">Passagens para consultar</p>
              {response.references.map((reference) => <p key={reference} className="py-1 text-sm text-[var(--zion-muted)]">📖 {reference}</p>)}
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
    </section>
  );
}
