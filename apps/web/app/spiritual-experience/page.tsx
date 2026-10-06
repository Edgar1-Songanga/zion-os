"use client";

import Link from "next/link";
import { useTranslation } from "@/components/i18n";

const items = [
  { title: "bibleEngine", eyebrow: "scripture", href: "/bible-engine", description: "Pesquisa, estudo e descoberta estruturada das Escrituras.", state: "engineAvailable" },
  { title: "prayer", eyebrow: "prayer", href: "/resa/prayer", description: "Pedidos, intercessão e acompanhamento de respostas em comunidade.", state: "engineAvailable" },
  { title: "devotion", eyebrow: "devotion", href: "/devotion", description: "Registo real de estudo, reflexão e oração associado à conta.", state: "apiIntegrated" },
  { title: "spiritualGrowth", eyebrow: "growth", href: "/spiritual-growth", description: "Linha factual de eventos espirituais e áreas de crescimento.", state: "apiIntegrated" },
  { title: "sabbathSchool", eyebrow: "study", href: "/sabbath-school", description: "Lições, referências bíblicas e continuidade de estudo.", state: "contentRepository" },
  { title: "adventistSources", eyebrow: "canon", href: "/adventist-canon", description: "Fontes com proveniência, autoridade e separação entre conteúdo e IA.", state: "contentRepository" },
  { title: "ministry", eyebrow: "ministry", href: "/ministry", description: "Contexto e estruturas ministeriais institucionais.", state: "engineAvailable" },
  { title: "gamification", eyebrow: "growthCommunity", href: "/gamification", description: "Pontuação factual, progressão e convites baseados em atividade real.", state: "engineAvailable" },
  { title: "spiritualChat", eyebrow: "ai", href: "/spiritual-chat", description: "Assistência para estudo e crescimento espiritual, sem substituir as fontes.", state: "experienceAvailable" },
] as const;

export default function SpiritualExperiencePage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[32px] bg-[#08152f] px-6 py-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10 sm:py-11">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.05] blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#D4AF37]/[0.06] blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">ZION OS · {t("spiritualLayer")}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{t("spiritualExperienceTitle")}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{t("spiritualExperienceDescription")}</p>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_42px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-2 focus:ring-[#0C1A3D]/20">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{t(item.eyebrow as never)}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition group-hover:bg-[#0C1A3D] group-hover:text-white">{t("open")}</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#0C1A3D]">{t(item.title as never)}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{t(`${item.title}Description` as never)}</p>
              <div className="mt-6 border-t border-slate-100 pt-4"><p className="text-[11px] font-medium leading-5 text-slate-400">{t(item.state as never)}</p></div>
            </Link>
          ))}
        </section>

        <section className="mt-7 rounded-[26px] border border-slate-200 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex gap-4">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
            <div>
              <p className="text-sm font-semibold text-[#0C1A3D]">{t("spiritualIntegrity")}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t("spiritualIntegrityDescription")}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
