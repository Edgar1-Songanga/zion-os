"use client";

import { useEffect, useState } from "react";
import BibleQuiz from "@/components/bible-engine/quiz/BibleQuiz";

const SESSION_KEY = "zion:bible-challenge-invitation-shown";

export default function BibleChallengeNudge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
      timer = setTimeout(() => {
        setOpen(true);
        window.sessionStorage.setItem(SESSION_KEY, "1");
      }, 45000);
    } catch {
      // If browser storage is unavailable, keep the challenge available via the floating button.
    }
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  function openChallenge() {
    setOpen(true);
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* optional session preference */ }
  }

  return (
    <>
      <button
        type="button"
        onClick={openChallenge}
        aria-haspopup="dialog"
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full border border-[#E2C477]/60 bg-[#071126] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(7,17,38,0.28)] transition hover:-translate-y-0.5 hover:bg-[#10264B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
      >
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-[#071126]">✦</span>
        <span>Desafio bíblico</span>
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
