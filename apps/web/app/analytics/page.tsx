"use client";

import { useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Summary = { total: number; by_event: Record<string, number> };

const numberFormat = new Intl.NumberFormat("pt-PT");

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void resaRequest<Summary>("/v1/platform/analytics/summary")
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => {
        if (active) setError("Verifique a ligação e tente novamente.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const events = useMemo(() => Object.entries(data?.by_event ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const maxEventCount = Math.max(1, ...events.map(([, count]) => count));

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-7 text-[#0C1A3D] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_24px_70px_rgba(7,17,38,0.15)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#E2C477]">ZION OS · Product intelligence</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Minha actividade</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Eventos associados à tua conta autenticada. Este resumo é pessoal e não representa a utilização agregada dos produtos ZION OS e RESA.</p>
          </div>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Não foi possível obter os dados de utilização. {error}</div>}

        <section aria-labelledby="usage-summary-title" className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <article className="relative overflow-hidden rounded-2xl border border-[#19385B] bg-[#0B2544] p-6 text-white shadow-[0_12px_30px_rgba(7,21,43,0.12)] sm:p-7">
            <p id="usage-summary-title" className="text-xs font-medium text-slate-300">Eventos desta conta</p>
            {loading ? <div className="mt-4 h-10 w-28 animate-pulse rounded-lg bg-white/10" /> : <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-[#E2C477]">{data ? numberFormat.format(data.total) : "—"}</p>}
            <p className="mt-3 text-xs leading-5 text-slate-400">Total devolvido para a tua conta autenticada; não é o total global da plataforma.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_24px_rgba(15,23,42,0.035)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Leitura dos dados</p><h2 className="mt-1 text-lg font-semibold">Actividade registada</h2></div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-500">Conta actual</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">A distribuição abaixo mostra apenas eventos associados à tua conta. O painel executivo de Product Analytics terá agregação própria, com acesso restrito à administração global.</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.035)]">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Distribuição de eventos</p>
            <h2 className="mt-1 text-lg font-semibold">Actividade por tipo</h2>
          </div>
          {loading ? <div className="space-y-5 p-5 sm:p-7">{[0, 1, 2].map((item) => <div key={item} className="space-y-2"><div className="h-3 w-32 animate-pulse rounded bg-slate-100" /><div className="h-2 animate-pulse rounded-full bg-slate-100" /></div>)}</div>
            : events.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-semibold text-[#0C1A3D]">Ainda não há eventos disponíveis</p><p className="mt-2 text-sm text-slate-500">Quando a actividade for registada, a distribuição aparecerá aqui.</p></div>
              : <div className="divide-y divide-slate-100">
                {events.map(([name, count]) => <div key={name} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium capitalize text-slate-700">{name.replaceAll("_", " ")}</p><span className="text-sm font-semibold tabular-nums text-[#0C1A3D] sm:hidden">{numberFormat.format(count)}</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#C8A24A]" style={{ width: (count / maxEventCount * 100) + "%" }} /></div>
                  </div>
                  <span className="hidden min-w-16 text-right text-sm font-semibold tabular-nums text-[#0C1A3D] sm:block">{numberFormat.format(count)}</span>
                </div>)}
              </div>}
        </section>
        <p className="text-center text-xs leading-5 text-slate-400">Este ecrã não apresenta métricas globais de adopção, retenção ou conversão dos produtos.</p>
      </div>
    </main>
  );
}
