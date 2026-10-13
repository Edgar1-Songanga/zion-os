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
          <button type="button" onClick={() => void publishToWall()} disabled={busy} className="inline-flex items-center justify-center rounded-xl bg-[#e2c477] px-4 py-3 text-sm font-semibold text-[#0a1731] transition hover:bg-[#f0d996] disabled:cursor-wait disabled:opacity-60">
            {busy ? "A publicar…" : "Convidar no mural"}
          </button>
          <Link href={messageUrl} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Convidar numa conversa
          </Link>
          <button type="button" onClick={() => void shareInvite()} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Partilhar convite
          </button>
          <Link href="/resa/live" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            Partilhar numa Live
          </Link>
          <button type="button" onClick={() => void copyInvite()} className="inline-flex items-center justify-center rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            Copiar convite
          </button>
        </div>

        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs leading-5 text-[#e2c477]">{status}</p>
      </div>
    </section>
  );
}
