"use client";

import Link from "next/link";
import ResaIcon from "./core/ResaIcon";
import { useTranslation } from "@/components/i18n";

export default function ResaHero() {
  const { t } = useTranslation();
  return (
    <section
      className="group relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-[#07142f] px-5 py-6 text-white shadow-[0_28px_90px_rgba(7,20,47,0.20)] sm:px-8 sm:py-8 lg:px-10 lg:py-9"
      aria-labelledby="resa-hero-title"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(80,148,255,0.22),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(251,191,36,0.18),transparent_28%),linear-gradient(120deg,#07142f_0%,#0b1d45_55%,#111f4b_100%)]" />
      <div className="absolute -right-28 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10 bg-white/[0.025] blur-[1px] transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute -bottom-40 left-[38%] -z-10 h-96 w-96 rounded-full bg-cyan-400/[0.07] blur-3xl" />

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
            {t("resaNetwork")}
          </div>

          <div className="mt-5 flex items-end gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.07] shadow-inner shadow-white/5">
              <ResaIcon name="sparkles" size={24} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{t("resaSocialExperience")}</p>
              <h1 id="resa-hero-title" className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">RESA</h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 sm:text-base">
            {t("resaDescription")}
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/resa/explore" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#08152f] shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
              <ResaIcon name="search" size={15} /> Explorar
            </Link>
            <Link href="/resa/communities" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
              <ResaIcon name="users" size={15} /> Comunidades
            </Link>
            <Link href="/resa/live" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
              <ResaIcon name="live" size={15} /> Ao vivo
            </Link>
          </div>
        </div>

        <div className="relative min-h-[250px] overflow-hidden rounded-[28px] border border-white/10 bg-black/10 p-2 shadow-2xl shadow-black/20">
          <div
            className="relative flex h-full min-h-[234px] items-end overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_65%_28%,rgba(125,211,252,0.25),transparent_25%),radial-gradient(circle_at_30%_72%,rgba(250,204,21,0.13),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))]"
            data-resa-visual-slot="hero"
            aria-label={t("resaVisualArea")}
          >
            <div className="absolute right-8 top-8 h-28 w-28 rounded-full border border-cyan-200/20 bg-cyan-200/[0.04] blur-[1px]" />
            <div className="absolute left-8 top-16 h-20 w-20 rounded-full border border-amber-200/20 bg-amber-200/[0.04]" />
            <div className="relative m-5 w-full rounded-2xl border border-white/10 bg-[#061128]/70 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{t("visualStage")}</span>
                <span className="text-[10px] font-medium text-slate-500">RESA / 01</span>
              </div>
              <div className="mt-4 h-2 w-2/3 rounded-full bg-white/10" />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-white/[0.06]" />
              <div className="mt-5 flex gap-2">
                <span className="h-8 flex-1 rounded-xl bg-white/[0.05]" />
                <span className="h-8 w-16 rounded-xl bg-cyan-300/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
