"use client";

import Link from "next/link";
import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

const CHALLENGE_URL = "https://zion-os-omega.vercel.app/bible-engine#bible-challenge";

function invitationText() {
  return "✦ Aceitas um desafio espiritual comigo? Vamos explorar a Bíblia no ZION OS Bible Challenge, aprender com as referências e avançar pelos níveis ao nosso ritmo. Entra aqui: " + CHALLENGE_URL;
}

export default function BibleChallengeInvite() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invitationText());
      setStatus("Convite copiado. Já podes enviá-lo a alguém.");
    } catch {
      setStatus("Não foi possível copiar automaticamente. Usa a opção de partilha do teu dispositivo.");
    }
  }

  async function shareInvite() {
    setStatus("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "ZION OS · Bible Challenge",
          text: invitationText(),
          url: CHALLENGE_URL,
        });
        setStatus("Partilha aberta no teu dispositivo.");
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
    await copyInvite();
  }

  async function publishToWall() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({
          type: "text",
          title: "Convite espiritual · Bible Challenge",
          body: invitationText(),
          visibility: "public",
          language: "pt",
        }),
      });
      setStatus("Convite publicado no mural do RESA.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível publicar o convite. Confirma a tua sessão e tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  const messageUrl = "/resa/messages?invite=" + encodeURIComponent(invitationText());
  const primaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#f3dda0]/70 bg-gradient-to-b from-[#f5dfa1] to-[#d2ad5e] px-4 py-3 text-sm font-bold text-[#0a1731] shadow-[0_8px_22px_rgba(226,196,119,0.16)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#e2c477] disabled:cursor-wait disabled:opacity-60";
  const secondaryAction = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white";

  return (
    <section aria-labelledby="bible-challenge-invite-title" className="relative overflow-hidden rounded-[28px] border border-[#d9c17d]/35 bg-[#0a1731] p-6 text-white shadow-[0_18px_50px_rgba(7,17,38,0.12)] sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-[#d4af37]/20" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/10" />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e2c477]">Aprender em comunidade</p>
        <h3 id="bible-challenge-invite-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">O desafio fica melhor quando é partilhado.</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Convida alguém para explorar as Escrituras contigo. Cada pessoa pode avançar ao seu ritmo, consultar as referências e aprender em cada resposta.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" onClick={() => void publishToWall()} disabled={busy} className={primaryAction}>
            {busy ? "A publicar…" : "Convidar no mural"}
          </button>
          <Link href={messageUrl} className={secondaryAction}>
            Convidar numa conversa
          </Link>
          <button type="button" onClick={() => void shareInvite()} className={secondaryAction}>
            Partilhar convite
          </button>
          <Link href="/resa/live" className={secondaryAction}>
            Partilhar numa Live
          </Link>
          <button type="button" onClick={() => void copyInvite()} className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white">
            Copiar convite
          </button>
        </div>

        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs leading-5 text-[#e2c477]">{status}</p>
      </div>
    </section>
  );
}
