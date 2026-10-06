"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ScoreCard from "@/components/gamification/ScoreCard";
import LevelProgress from "@/components/gamification/LevelProgress";
import ReferralCard from "@/components/gamification/ReferralCard";

type GamificationData = { points: number; level: number; nextLevel: number; pointsToNextLevel: number; events: Array<{ id: string; action: string; points: number; occurredAt: string }> };

const actionLabels: Record<string, string> = {
  devotion_completed: "Devoção concluída",
  prayer_completed: "Oração concluída",
  bible_read: "Leitura bíblica",
  study_completed: "Estudo concluído",
  service_completed: "Serviço",
  community_contribution: "Contribuição comunitária",
  leadership_activity: "Atividade de liderança",
};

export default function GamificationPage() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void resaRequest<GamificationData>("/v1/gamification/me").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar a progressão."));
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[34px] bg-[#08152f] px-6 py-9 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.05] blur-2xl" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">ZION OS · Growth & Community</p>
          <h1 className="relative mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Progressão ZION</h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Gamificação responsável: pontos derivados de eventos espirituais reais, com limites diários definidos pelo motor e sem pontuações fictícias.</p>
        </section>
        {error ? <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{error}</div> : null}
        {data ? (
          <>
            <section className="mt-7 grid gap-5 lg:grid-cols-2"><ScoreCard points={data.points} level={data.level} /><LevelProgress points={data.points} level={data.level} pointsToNextLevel={data.pointsToNextLevel} /></section>
            <section className="mt-7 grid gap-5 lg:grid-cols-2">
              <ReferralCard />
              <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Activity</p>
                <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Atividade que gerou pontos</h2>
                <div className="mt-5 space-y-2">
                  {data.events.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Ainda não existem eventos elegíveis para pontuação.</p> : data.events.slice(-12).reverse().map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><div><p className="text-sm font-semibold text-[#0C1A3D]">{actionLabels[event.action] ?? event.action}</p><p className="text-xs text-slate-400">{new Date(event.occurredAt).toLocaleString("pt-PT")}</p></div><span className="text-sm font-semibold text-[#0C1A3D]">+{event.points}</span></div>
                  ))}
                </div>
              </section>
            </section>
          </>
        ) : !error ? <p className="mt-8 text-center text-sm text-slate-400">A carregar a progressão…</p> : null}
      </div>
    </main>
  );
}
