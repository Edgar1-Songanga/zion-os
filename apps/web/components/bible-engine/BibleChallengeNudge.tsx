"use client";

import { useState } from "react";
import BibleQuiz from "@/components/bible-engine/quiz/BibleQuiz";

export default function BibleChallengeNudge() {
  const [open, setOpen] = useState(false);

  function openChallenge() {
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openChallenge}
        aria-label="Abrir Quiz bíblico"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Abrir Quiz bíblico"
        className="group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[70] isolate inline-flex h-14 items-center gap-2.5 rounded-full border border-[#E2C477]/75 bg-[linear-gradient(145deg,#1B365F_0%,#102448_52%,#071326_100%)] px-3.5 text-[#F2D895] shadow-[0_12px_34px_rgba(4,13,29,0.38),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-white/10 transition-[box-shadow,filter] duration-300 hover:shadow-[0_18px_42px_rgba(4,13,29,0.48),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] motion-safe:animate-quiz-float motion-reduce:animate-none sm:bottom-6 sm:right-6 sm:gap-3 sm:px-4"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -inset-[5px] -z-10 rounded-full border border-[#E2C477]/25 motion-safe:animate-quiz-halo motion-reduce:hidden" />
        <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E2C477]/20 bg-[#E2C477]/10 text-[#F5DFA5] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-[1.35rem] w-[1.35rem]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 5.5c2.7-.9 5.2-.5 7.5 1.2v12c-2.3-1.7-4.8-2.1-7.5-1.2z" />
            <path d="M19.5 5.5c-2.7-.9-5.2-.5-7.5 1.2v12c2.3-1.7 4.8-2.1 7.5-1.2z" />
            <path d="M12 6.7v12" />
            <path d="m18.5 2 .55 1.45L20.5 4l-1.45.55L18.5 6l-.55-1.45L16.5 4l1.45-.55z" />
          </svg>
        </span>
        <span className="relative text-xs font-semibold tracking-[0.02em] text-white sm:text-sm">Quiz bíblico</span>
        <span className="sr-only">Abrir desafio bíblico</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#030914]/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bible-challenge-invitation-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[1.8rem] bg-[#F4F6FA] p-4 shadow-2xl sm:rounded-[2rem] sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Uma pausa que fortalece</p>
                <h2 id="bible-challenge-invitation-title" className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D] sm:text-2xl">Aceitas o desafio de hoje?</h2>
                <p className="mt-1 text-sm text-slate-500">Uma experiência curta de conhecimento bíblico, com níveis e progresso.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar desafio bíblico" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-500 hover:text-slate-900">×</button>
            </div>
            <BibleQuiz compact />
            <p className="px-2 pt-3 text-center text-[11px] leading-5 text-slate-400">O convite pode ser fechado a qualquer momento. O progresso é sincronizado quando a ligação e a sessão estão disponíveis.</p>
          </section>
        </div>
      )}
    </>
  );
}
