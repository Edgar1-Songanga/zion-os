"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Lesson = {
  id: string; quarter: string; year: number; lessonNumber: number; title: string; language: string;
  bibleReferences?: string[]; memoryVerse?: string;
};

export default function SabbathSchoolPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resaRequest<Lesson[]>("/v1/spiritual/sabbath-school")
      .then((data) => setLessons(data ?? []))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as lições."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[32px] bg-[#08152f] px-6 py-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10 sm:py-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.05] blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Spiritual Experience · Study</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Escola Sabatina</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Lições, referências bíblicas, memória e continuidade de estudo.</p>
          </div>
        </header>
        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        <section className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-semibold tracking-tight text-[#0C1A3D]">Lições disponíveis</h2><p className="mt-1 text-sm text-slate-500">Dados provenientes da API espiritual.</p></div>
            <span className="text-xs font-medium text-slate-400">{loading ? "A carregar…" : lessons.length + " lições"}</span>
          </div>
          {lessons.length === 0 && !loading ? (
            <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-500 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">A API da Escola Sabatina está exposta, mas o repositório ainda não fornece lições de produção. O ZION não fabrica lições para preencher a interface.</div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lessons.map((lesson) => (
                <article key={lesson.id} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{lesson.year} · {lesson.quarter} · Lição {lesson.lessonNumber}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#0C1A3D]">{lesson.title}</h3>
                  <p className="mt-2 text-xs text-slate-400">{lesson.language}</p>
                  {lesson.memoryVerse && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">“{lesson.memoryVerse}”</p>}
                  {lesson.bibleReferences?.length ? <p className="mt-4 text-sm text-slate-500">{lesson.bibleReferences.join(" · ")}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
