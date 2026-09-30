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
    <div className="max-w-3xl rounded-3xl border bg-white p-8 shadow">
      <h2 className="text-2xl font-bold text-[#0C1A3D]">🙏 ZION Spiritual Assistant</h2>
      <p className="mt-2 text-sm text-slate-500">Assistência espiritual contextual, com IA opcional.</p>

      <div className="mt-6 flex gap-3">
        <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pergunte sobre a Bíblia, oração, Escola Sabatina ou discipulado..." className="flex-1 rounded-xl border p-4" />
        <button onClick={send} className="rounded-xl bg-[#0C1A3D] px-6 text-white">Enviar</button>
      </div>

      {response && (
        <div className="mt-8 rounded-2xl bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold">{response.title}</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">{response.intent}</span>
          </div>
          <p className="mt-3">{response.answer}</p>

          {response.references.length > 0 && (
            <div className="mt-4">
              {response.references.map((ref) => <p key={ref}>📖 {ref}</p>)}
            </div>
          )}

          {response.nextSteps.length > 0 && (
            <div className="mt-5">
              <p className="font-semibold">Próximos passos</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {response.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
