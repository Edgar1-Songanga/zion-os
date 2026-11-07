"use client";

import Link from "next/link";
import { useTranslation } from "@/components/i18n";

const destinations = [
  { eyebrow: "dashLearn", title: "Bible Challenge", description: "dashLearnDesc", href: "/bible-engine#bible-challenge", action: "dashContinue", number: "01" },
  { eyebrow: "dashReflect", title: "dashDevotion", description: "dashDevotionDesc", href: "/devotion", action: "dashOpenDevotion", number: "02" },
  { eyebrow: "dashStudyTogether", title: "dashSabbath", description: "dashSabbathDesc", href: "/sabbath-school", action: "dashExploreStudies", number: "03" },
  { eyebrow: "dashGrow", title: "dashJourney", description: "dashJourneyDesc", href: "/spiritual-growth", action: "dashViewJourney", number: "04" },
] as const;

export default function DashboardContent() {
  const { t, locale, ready } = useTranslation();
  const copy = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <main lang={locale} aria-busy={!ready} className="mx-auto max-w-[1440px] space-y-7 pb-8">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#07152B] px-6 py-9 text-white shadow-[0_28px_90px_rgba(7,21,43,0.18)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=85')" }} />
        <div aria-hidden="true" className="absolute inset-0 z-[1] bg-[linear-gradient(105deg,rgba(5,15,32,0.98)_0%,rgba(7,21,43,0.88)_56%,rgba(7,21,43,0.52)_100%)]" />
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#E2C477]/20" />
        <div aria-hidden="true" className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">{copy("dashEyebrow")}</p>
          <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">{copy("dashHeroTitle")}</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">{copy("dashHeroDescription")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/bible-engine#bible-challenge" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E2C477] px-6 py-3 text-sm font-semibold text-[#07152B] shadow-[0_8px_28px_rgba(226,196,119,0.18)] transition hover:-translate-y-0.5 hover:bg-[#F0D99A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy("dashStartBible")} <span aria-hidden="true" className="ml-2">↗</span></Link>
            <Link href="/resa" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy("resa")}</Link>
          </div>
        </div>
        <div className="relative mt-10 grid gap-3 border-t border-white/15 pt-5 text-xs text-slate-300 sm:grid-cols-3 sm:gap-5 sm:pt-6">
          {(["dashBenefitLearn", "dashBenefitPace", "dashBenefitCommunity"] as const).map((key) => <p key={key} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#E2C477]" />{copy(key)}</p>)}
        </div>
      </section>

      <section>
        <article className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_34px_rgba(15,23,42,0.045)] sm:p-8">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]"><span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF6E8] text-base">✦</span>{copy("dashNextStep")}</div>
          <h2 className="mt-5 max-w-lg text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">{copy("dashAttentionTitle")}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{copy("dashReading")} <strong className="font-semibold text-[#0C1A3D]">Filipenses 4:8</strong>. {copy("dashReadingPrompt")}</p>
          <Link href="/bible-engine" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0C1A3D] underline decoration-[#D4AF37] decoration-2 underline-offset-4 hover:text-[#8B6F16]">{copy("dashOpenBibleEngine")} <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section aria-labelledby="journey-destinations-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">{copy("dashExploreZion")}</p><h2 id="journey-destinations-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">{copy("dashChooseNext")}</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">{copy("dashNoRush")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((item) => <Link key={item.href} href={item.href} className="group rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C1A3D] sm:p-6"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{copy(item.eyebrow)}</span><span className="text-xs font-semibold tabular-nums text-[#B08B36]">{item.number}</span></div><h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0C1A3D]">{item.title === "Bible Challenge" ? item.title : copy(item.title)}</h3><p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">{copy(item.description)}</p><p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-[#0C1A3D]">{copy(item.action)}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></p></Link>)}
        </div>
      </section>
      <p className="px-1 text-center text-xs leading-5 text-slate-400">{copy("dashClosing")}</p>
    </main>
  );
}
