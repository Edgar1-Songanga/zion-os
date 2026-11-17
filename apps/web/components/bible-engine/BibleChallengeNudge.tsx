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
        className="group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[70] flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-full border border-[#E2C477]/70 bg-[radial-gradient(circle_at_30%_20%,#233d67_0%,#102448_48%,#071326_100%)] text-[#F2D895] shadow-[0_10px_30px_rgba(4,13,29,0.38),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/10 transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(4,13,29,0.46)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-2.5 sm:px-4 sm:py-3"
      >
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E2C477]/12 text-[#F2D895]">
          <svg viewBox="0 0 24 24" fill="none" className="h-[1.35rem] w-[1.35rem]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 5.5c2.7-.9 5.2-.5 7.5 1.2v12c-2.3-1.7-4.8-2.1-7.5-1.2z" />
            <path d="M19.5 5.5c-2.7-.9-5.2-.5-7.5 1.2v12c2.3-1.7 4.8-2.1 7.5-1.2z" />
            <path d="M12 6.7v12" />
            <path d="m18.5 2 .55 1.45L20.5 4l-1.45.55L18.5 6l-.55-1.45L16.5 4l1.45-.55z" />
          </svg>
        </span>
        <span className="hidden text-sm font-semibold tracking-[0.01em] text-white sm:inline">Quiz bíblico</span>
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
