"use client";
import Link from "next/link";
import { useTranslation } from "@/components/i18n";

const destinations = [
  { eyebrow: "dashReflect", title: "dashDevotion", description: "dashDevotionDesc", href: "/devotion", action: "dashOpenDevotion", number: "01" },
  { eyebrow: "dashStudyTogether", title: "dashSabbath", description: "dashSabbathDesc", href: "/sabbath-school", action: "dashExploreStudies", number: "02" },
  { eyebrow: "dashGrow", title: "dashJourney", description: "dashJourneyDesc", href: "/spiritual-growth", action: "dashViewJourney", number: "03" },
] as const;

export default function DashboardContent() {
  const { t, locale, ready } = useTranslation();
  const copy = (key: string) => t(key as Parameters<typeof t>[0]);
  return (
    <div lang={locale} aria-busy={!ready} className="mx-auto max-w-[1440px] space-y-8 pb-10">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#07152B] px-6 py-8 text-white shadow-[0_24px_70px_rgba(7,21,43,0.16)] sm:px-10 sm:py-10 lg:px-14 lg:py-12">
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_82%_12%,rgba(200,162,74,0.16),transparent_34%),radial-gradient(ellipse_at_92%_90%,rgba(94,143,184,0.15),transparent_38%),linear-gradient(115deg,#07152B_0%,#102B49_58%,#0B1B31_100%)]" />
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#E2C477]/15" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">{copy("dashEyebrow")}</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]">{copy("dashHeroTitle")}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">{copy("dashHeroDescription")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/bible-engine" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#f3dda0]/70 bg-gradient-to-b from-[#f5dfa1] via-[#e2c477] to-[#c59c43] px-6 py-3 text-sm font-bold text-[#07152B] shadow-[0_10px_28px_rgba(226,196,119,0.2),inset_0_1px_0_rgba(255,255,255,0.55)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy("dashOpenBibleEngine")} <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#07152B]/10 transition-transform group-hover:translate-x-0.5">↗</span></Link>
            <Link href="/resa" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.07] px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy("resa")}</Link>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.12] pt-5 text-xs text-slate-300">
          {(["dashBenefitLearn", "dashBenefitPace", "dashBenefitCommunity"] as const).map((key) => <p key={key} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#E2C477]" />{copy(key)}</p>)}
        </div>
      </section>
      <section aria-labelledby="journey-destinations-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">{copy("dashExploreZion")}</p><h2 id="journey-destinations-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">{copy("dashChooseNext")}</h2></div>
          <p className="max-w-md text-sm leading-6 text-slate-500">{copy("dashNoRush")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {destinations.map((item) => <Link key={item.href} href={item.href} className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C1A3D] sm:p-6">
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{copy(item.eyebrow)}</span><span className="text-xs font-semibold tabular-nums text-[#B08B36]">{item.number}</span></div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0C1A3D]">{copy(item.title)}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{copy(item.description)}</p>
            <p className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-[#0C1A3D]">{copy(item.action)}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></p>
          </Link>)}
        </div>
      </section>
      <p className="px-1 text-center text-xs leading-5 text-slate-400">{copy("dashClosing")}</p>
    </div>
  );
}
