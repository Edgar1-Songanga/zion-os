"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Source = { id: string; title: string; description?: string; url?: string; authority?: string };
type RecordItem = { id: string; title?: string; type?: string; language?: string; summary?: string };

export default function AdventistCanonPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      resaRequest<Source[]>("/v1/spiritual/adventist/sources"),
      resaRequest<RecordItem[]>("/v1/spiritual/adventist/content"),
    ]).then(([sourceData, recordData]) => {
      setSources(sourceData ?? []);
      setRecords(recordData ?? []);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as fontes Adventistas.");
    }).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[32px] bg-[#08152f] px-6 py-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10 sm:py-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.05] blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Spiritual Experience · Canon</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Fontes Adventistas</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Fontes com proveniência e autoridade separadas de comentário comunitário e geração por IA.</p>
          </div>
        </header>
        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-semibold tracking-tight text-[#0C1A3D]">Fontes registadas</h2><p className="mt-1 text-sm text-slate-500">Proveniência mantida no domínio espiritual.</p></div>
            <span className="text-xs font-medium text-slate-400">{loading ? "A carregar…" : sources.length + " fontes"}</span>
          </div>
          {sources.length === 0 && !loading ? (
            <div className="rounded-[26px] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-500 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">A API está disponível, mas não existem fontes registadas no repositório de produção neste momento.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sources.map((source) => (
                <article key={source.id} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="font-semibold text-[#0C1A3D]">{source.title}</h3>
                  {source.authority && <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{source.authority}</p>}
                  {source.description && <p className="mt-3 text-sm leading-6 text-slate-500">{source.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="mt-7 rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-xl font-semibold tracking-tight text-[#0C1A3D]">Conteúdo canónico</h2><p className="mt-1 text-sm text-slate-500">Registos servidos pelo repositório espiritual.</p></div>
            <span className="text-xs font-medium text-slate-400">{loading ? "…" : records.length}</span>
          </div>
          {records.length === 0 && !loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-500">A API está exposta, mas não existem registos canónicos disponíveis no repositório de produção. O ZION mantém a integridade dos dados e não simula conteúdo.</div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {records.map((record) => (
                <article key={record.id} className="rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-medium text-[#0C1A3D]">{record.title ?? record.id}</h3>
                  <p className="mt-2 text-xs text-slate-400">{record.type ?? "fonte"} · {record.language ?? "idioma não indicado"}</p>
                  {record.summary && <p className="mt-3 text-sm text-slate-500">{record.summary}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
