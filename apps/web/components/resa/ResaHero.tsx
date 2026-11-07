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

      <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {t("resaNetwork")}
          </div>

          <div className="mt-5 flex items-end gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.07] shadow-inner shadow-white/5">
              <ResaIcon name="message" size={24} />
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
              <ResaIcon name="search" size={15} /> {t("explore")}
            </Link>
            <Link href="/resa/communities" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
              <ResaIcon name="users" size={15} /> {t("communitiesAction")}
            </Link>
            <Link href="/resa/live" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
              <ResaIcon name="live" size={15} /> {t("live")}
            </Link>
          </div>
      </div>
    </section>
  );
}
