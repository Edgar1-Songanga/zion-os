"use client";

import { useState } from "react";
import { spiritualSearch } from "@/services/spiritual-chat";

export default function SpiritualChat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<ReturnType<typeof spiritualSearch> | null>(null);

  function send() {
    setResponse(spiritualSearch(message));
  }

  return (
    <div className="max-w-3xl rounded-3xl border border-[var(--zion-border)] bg-white p-8 shadow-[var(--zion-shadow-sm)]">
      <div className="h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
      <h2 className="mt-5 text-2xl font-bold tracking-tight text-[var(--zion-primary)]">🙏 ZION Spiritual Assistant</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Assistência espiritual contextual, com IA opcional.</p>

      <div className="mt-6 flex gap-3">
        <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pergunte sobre a Bíblia, oração, Escola Sabatina ou discipulado..." className="flex-1 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4 text-[var(--zion-dark)] outline-none transition focus:border-[var(--zion-sky)] focus:bg-white focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
        <button onClick={send} className="rounded-xl bg-[var(--zion-primary)] px-6 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)]">Enviar</button>
      </div>

      {response && (
        <div className="mt-8 rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[var(--zion-dark)]">{response.title}</h3>
            <span className="rounded-full border border-[var(--zion-border)] bg-white px-3 py-1 text-xs text-[var(--zion-muted)]">{response.intent}</span>
          </div>
          <p className="mt-3 text-[var(--zion-dark)]">{response.answer}</p>

          {response.references.length > 0 && (
            <div className="mt-4">
              {response.references.map((ref) => <p key={ref} className="text-sm text-[var(--zion-muted)]">📖 {ref}</p>)}
            </div>
          )}

          {response.nextSteps.length > 0 && (
            <div className="mt-5">
              <p className="font-semibold text-[var(--zion-dark)]">Próximos passos</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--zion-muted)]">
                {response.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
