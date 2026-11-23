"use client";

import { useRef, useState } from "react";
import BibleQuiz from "@/components/bible-engine/quiz/BibleQuiz";

type FloatingPosition = { left: number; top: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

const BUTTON_SIZE = 44;
const VIEWPORT_GUTTER = 8;

export default function BibleChallengeNudge() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const dragState = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    drag.moved = true;

    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - BUTTON_SIZE - VIEWPORT_GUTTER);
    const maxTop = Math.max(VIEWPORT_GUTTER, window.innerHeight - BUTTON_SIZE - VIEWPORT_GUTTER);
    setPosition({
      left: Math.min(maxLeft, Math.max(VIEWPORT_GUTTER, drag.startLeft + deltaX)),
      top: Math.min(maxTop, Math.max(VIEWPORT_GUTTER, drag.startTop + deltaY)),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClick.current = drag.moved;
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Abrir Quiz bíblico — arraste para mover"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Quiz bíblico · arraste para mover"
        style={position ? { left: position.left, top: position.top, right: "auto", bottom: "auto" } : undefined}
        className={`fixed z-50 isolate flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border border-white/30 bg-[rgba(24,65,112,0.34)] text-white shadow-[0_5px_18px_rgba(4,18,38,0.16),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-200 hover:bg-[rgba(24,65,112,0.48)] hover:shadow-[0_7px_22px_rgba(4,18,38,0.22),inset_0_1px_0_rgba(255,255,255,0.38)] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#D4AF37] ${position ? "" : "bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6"}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[1.25rem] w-[1.25rem]" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 5.5c2.7-.9 5.2-.5 7.5 1.2v12c-2.3-1.7-4.8-2.1-7.5-1.2z" />
          <path d="M19.5 5.5c-2.7-.9-5.2-.5-7.5 1.2v12c2.3-1.7 4.8-2.1 7.5-1.2z" />
          <path d="M12 6.7v12" />
        </svg>
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
