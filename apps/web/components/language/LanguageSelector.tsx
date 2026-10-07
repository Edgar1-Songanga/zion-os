"use client";

import { useTranslation } from "@/components/i18n";

export default function LanguageSelector() {
  const { locale, locales, localeLabels, setLocale, t } = useTranslation();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t("selectLanguage")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        aria-label={t("language")}
        className="rounded-xl border border-[var(--zion-border)] bg-white px-3.5 py-2 text-sm text-[var(--zion-dark)] shadow-[var(--zion-shadow-sm)] outline-none transition hover:border-[var(--zion-sky)] focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
