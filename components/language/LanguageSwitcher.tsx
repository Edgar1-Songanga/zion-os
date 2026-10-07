"use client";

import { useTranslation } from "@/components/i18n";

export default function LanguageSwitcher() {
  const { locale, locales, localeLabels, setLocale } = useTranslation();

  return (
    <label className="relative block">
      <span className="sr-only">Selecionar idioma</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
        aria-label="Selecionar idioma"
      >
        {locales.map((language) => (
          <option key={language} value={language}>
            {localeLabels[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
