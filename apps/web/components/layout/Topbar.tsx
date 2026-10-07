"use client";

import LanguageSelector from "@/components/language/LanguageSelector";
import { useTranslation } from "@/components/i18n";

export default function Topbar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-5">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-[0.12em] text-[#0B2D4D]">ZION OS</h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{t("brandDescription")}</p>
        </div>

        <div className="hidden min-w-[260px] max-w-[420px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-slate-400">{t("search")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <LanguageSelector />

        <button type="button" aria-label="Theme" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#C8A24A] hover:text-[#0B2D4D]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        </button>

        <button type="button" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#C8A24A] hover:text-[#0B2D4D]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#C8A24A]" />
        </button>

        <div className="ml-1 flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2D4D] text-sm font-semibold text-white ring-2 ring-[#C8A24A]/30">
            E
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-[#0B2D4D]">Edgar</p>
            <p className="text-[10px] text-slate-500">{t("administrator")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
