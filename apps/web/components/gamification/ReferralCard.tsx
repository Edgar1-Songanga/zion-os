"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type ReferralData = { code: string; invitePath: string; qualifiedCount: number; pendingCount: number };

export default function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void resaRequest<ReferralData>("/v1/referrals/me").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar o convite."));
  }, []);

  async function copyInvitation() {
    if (!data) return;
    const url = window.location.origin + data.invitePath;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Referral</p>
      <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Invite & Grow</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">Convide pessoas para a comunidade ZION através de um código real associado à sua conta.</p>
      {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {data ? (
        <>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Código pessoal</p>
            <p className="mt-2 break-all font-mono text-sm font-semibold text-[#0C1A3D]">{data.code}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 p-4"><p className="text-2xl font-semibold text-[#0C1A3D]">{data.pendingCount}</p><p className="text-xs text-slate-500">Pendentes</p></div>
            <div className="rounded-2xl border border-slate-100 p-4"><p className="text-2xl font-semibold text-[#0C1A3D]">{data.qualifiedCount}</p><p className="text-xs text-slate-500">Qualificados</p></div>
          </div>
          <button type="button" onClick={copyInvitation} className="mt-5 w-full rounded-2xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95">
            {copied ? "Convite copiado" : "Copiar convite"}
          </button>
        </>
      ) : !error ? <p className="mt-6 text-sm text-slate-400">A preparar o seu convite seguro…</p> : null}
    </section>
  );
}
