"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { LocalizedText } from "@/components/i18n/LocalizedText";

type DailySection = {
  day: string;
  title?: string;
  focus?: string;
  summary?: string;
  bibleReferences?: string[];
  sourceUrl?: string;
};

type Lesson = {
  id: string;
  quarter: string;
  year: number;
  lessonNumber: number;
  title: string;
  language: string;
  memoryVerse?: string;
  memoryVerseReference?: string;
  coverImageUrl?: string;
  bibleReferences?: string[];
  dailySections?: DailySection[];
  discussionQuestions?: string[];
  sourceUrl?: string;
  rights?: string;
};

type BibleResult = {
  reference: { book: string; chapter: number; verseStart?: number; verseEnd?: number };
  text: string;
  verses?: string[];
  translation: string;
  copyright?: string;
};

export default function SabbathSchoolPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [biblePassage, setBiblePassage] = useState<BibleResult | null>(null);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resaRequest<Lesson[]>("/v1/spiritual/sabbath-school")
      .then((data) => {
        if (active) setLessons(data ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as lições.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function openBibleReference(reference: string) {
    setSelectedReference(reference);
    setBiblePassage(null);
    setBibleError(null);
    setBibleLoading(true);
    try {
      const results = await resaRequest<BibleResult[]>(
        `/v1/spiritual/bible/search?q=${encodeURIComponent(reference)}&translation=almeida-livre`,
      );
      if (!results[0]) {
        setBibleError("A referência não foi encontrada na versão selecionada.");
      } else {
        setBiblePassage(results[0]);
      }
    } catch (reason: unknown) {
      setBibleError(reason instanceof Error ? reason.message : "Não foi possível consultar a Bíblia.");
    } finally {
      setBibleLoading(false);
    }
  }

  const featuredLesson = lessons[0];

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[32px] bg-[#08152f] px-6 py-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10 sm:py-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.05] blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-400/[0.08] blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Spiritual Experience · Study</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Escola Sabatina</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Estudo bíblico semanal, referências numeradas e recursos oficiais numa experiência de leitura clara.</p>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {featuredLesson && (
          <section className="mt-7 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <div className="grid lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
              <div className="relative min-h-[250px] bg-[#0C1A3D]">
                {featuredLesson.coverImageUrl ? (
                  <img
                    src={featuredLesson.coverImageUrl}
                    alt={`Capa da lição ${featuredLesson.lessonNumber}: ${featuredLesson.title}`}
                    loading="eager"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col justify-end bg-[radial-gradient(circle_at_70%_20%,rgba(125,211,252,0.22),transparent_35%),linear-gradient(145deg,#0C1A3D,#071128)] p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Escola Sabatina</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{featuredLesson.quarter} · {featuredLesson.year}</p>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-8 lg:p-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B6F16]">Lição em destaque · {featuredLesson.year} · {featuredLesson.quarter}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">
                  <LocalizedText text={featuredLesson.title} contentType="spiritual" />
                </h2>
                <p className="mt-2 text-sm text-slate-500">Lição {featuredLesson.lessonNumber} · {featuredLesson.language.toUpperCase()}</p>
                {featuredLesson.memoryVerseReference && (
                  <p className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-[#0C1A3D]">
                    Versículo de memória: {featuredLesson.memoryVerseReference}
                  </p>
                )}
                {featuredLesson.memoryVerse && (
                  <blockquote className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    “<LocalizedText text={featuredLesson.memoryVerse} contentType="spiritual" />”
                  </blockquote>
                )}
                {featuredLesson.bibleReferences?.length ? (
                  <div className="mt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Leituras bíblicas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {featuredLesson.bibleReferences.map((reference) => (
                        <button key={reference} type="button" onClick={() => void openBibleReference(reference)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#0C1A3D] transition hover:border-[#0C1A3D] hover:bg-slate-50">
                          {reference}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {featuredLesson.sourceUrl && (
                  <a href={featuredLesson.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#152b59]">
                    Consultar fonte oficial <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#0C1A3D]">Lições disponíveis</h2>
              <p className="mt-1 text-sm text-slate-500">Conteúdo associado à fonte e aos dados registados no ZION OS.</p>
            </div>
            <span className="text-xs font-medium text-slate-400">{loading ? "A carregar…" : `${lessons.length} lições`}</span>
          </div>

          {lessons.length === 0 && !loading ? (
            <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-500 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              Ainda não existem lições registadas para esta conta. O ZION não inventa conteúdo oficial para preencher a interface.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lessons.slice(featuredLesson ? 1 : 0).map((lesson) => (
                <article key={lesson.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                  {lesson.coverImageUrl && (
                    <div className="relative aspect-[16/9] bg-slate-100">
                      <img
                        src={lesson.coverImageUrl}
                        alt={`Capa da lição ${lesson.lessonNumber}: ${lesson.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{lesson.year} · {lesson.quarter} · Lição {lesson.lessonNumber}</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#0C1A3D]"><LocalizedText text={lesson.title} contentType="spiritual" /></h3>
                    {lesson.memoryVerseReference && <p className="mt-3 text-sm font-medium text-slate-600">Versículo de memória: {lesson.memoryVerseReference}</p>}
                    {lesson.bibleReferences?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {lesson.bibleReferences.map((reference) => (
                          <button key={reference} type="button" onClick={() => void openBibleReference(reference)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0C1A3D] hover:bg-slate-50">
                            {reference}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {lesson.dailySections?.length ? (
                      <details className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-[#0C1A3D]">Plano de estudo diário</summary>
                        <div className="mt-4 space-y-4">
                          {lesson.dailySections.map((section, sectionIndex) => (
                            <div key={`${section.day}-${sectionIndex}`}>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{section.day}</p>
                              {(section.title || section.focus) && <p className="mt-1 text-sm font-medium text-slate-700">{section.title || section.focus}</p>}
                              {section.summary && <p className="mt-1 text-sm leading-6 text-slate-500">{section.summary}</p>}
                              {section.bibleReferences?.length ? <p className="mt-1 text-xs text-slate-500">{section.bibleReferences.join(" · ")}</p> : null}
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    {lesson.discussionQuestions?.length ? (
                      <details className="mt-3 rounded-2xl border border-slate-200 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-[#0C1A3D]">Perguntas para reflexão</summary>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
                          {lesson.discussionQuestions.map((question) => <li key={question}>• <LocalizedText text={question} contentType="spiritual" /></li>)}
                        </ul>
                      </details>
                    ) : null}
                    {lesson.sourceUrl && <a href={lesson.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-semibold text-[#8B6F16] hover:underline">Abrir fonte oficial ↗</a>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedReference && (
          <aside className="fixed inset-x-4 bottom-4 z-20 mx-auto max-h-[75vh] max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)] sm:inset-x-auto sm:right-8 sm:w-[520px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bible Engine</p>
                <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{selectedReference}</h2>
              </div>
              <button type="button" onClick={() => setSelectedReference(null)} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500">Fechar</button>
            </div>
            {bibleLoading && <p className="mt-5 text-sm text-slate-500">A consultar a Escritura…</p>}
            {bibleError && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{bibleError}</p>}
            {biblePassage && (
              <div className="mt-5 space-y-3">
                {biblePassage.verses?.length ? biblePassage.verses.map((verse, index) => {
                  const number = (biblePassage.reference.verseStart ?? 1) + index;
                  return (
                    <p key={`${number}-${verse.slice(0, 20)}`} className="flex gap-3 text-sm leading-7 text-slate-700">
                      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-[11px] font-bold text-[#0C1A3D]">{number}</span>
                      <span>{verse}</span>
                    </p>
                  );
                }) : <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{biblePassage.text}</p>}
                {biblePassage.copyright && <p className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">{biblePassage.copyright}</p>}
              </div>
            )}
            {!bibleLoading && !bibleError && !biblePassage && <p className="mt-5 text-sm text-slate-500">Sem texto disponível.</p>}
          </aside>
        )}
      </div>
    </main>
  );
}
