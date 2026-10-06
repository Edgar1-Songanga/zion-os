"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const ZION_LOCALES = [
  "pt-AO", "pt-PT", "en", "fr", "es", "de", "it", "zh", "ar", "sw",
  "af", "osh", "umb", "kmb", "ln", "am", "yo", "ha", "zu", "xh",
] as const;

export type ZionLocale = (typeof ZION_LOCALES)[number];

export const ZION_LOCALE_LABELS: Record<ZionLocale, string> = {
  "pt-AO": "Português (Angola)",
  "pt-PT": "Português (Portugal)",
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  zh: "中文",
  ar: "العربية",
  sw: "Kiswahili",
  af: "Afrikaans",
  osh: "Oshiwambo",
  umb: "Umbundu",
  kmb: "Kimbundu",
  ln: "Lingála",
  am: "አማርኛ",
  yo: "Yorùbá",
  ha: "Hausa",
  zu: "isiZulu",
  xh: "isiXhosa",
};

const SOURCE_LOCALE: ZionLocale = "pt-AO";
const STORAGE_KEY = "zion.locale";
const CACHE_KEY = "zion.translation.shell.v1";

const sourceStrings = {
  brandDescription: "Ecossistema Digital Adventista Global",
  administrator: "Administrador",
  language: "Idioma",
  selectLanguage: "Selecionar idioma",
  core: "NÚCLEO",
  dashboard: "Painel",
  resa: "RESA",
  spiritualExperience: "EXPERIÊNCIA ESPIRITUAL",
  spiritualVision: "Visão espiritual",
  bibleEngine: "Bible Engine",
  prayer: "Oração",
  devotion: "Devoção",
  spiritualGrowth: "Crescimento espiritual",
  sabbathSchool: "Escola Sabatina",
  adventistSources: "Fontes Adventistas",
  ministry: "Ministry",
  spiritualChat: "Spiritual Chat",
  communities: "Communities",
  organization: "ORGANIZAÇÃO",
  administration: "Administração",
  finance: "Finanças",
  reports: "Relatórios",
  globalDigitalEcosystem: "Ecossistema Digital Global",
  globalAdministrator: "Administrador Global",
  spiritualLayer: "Camada Espiritual",
  spiritualExperienceTitle: "Experiência Espiritual",
  spiritualExperienceDescription: "Um ponto de entrada único para os motores espirituais do ZION. A experiência organiza os serviços existentes sem substituir os seus motores, fontes ou regras de domínio.",
  scripture: "Escrituras",
  study: "Estudo",
  growth: "Crescimento",
  canon: "Cânone",
  ai: "IA",
  growthCommunity: "Crescimento e Comunidade",
  open: "Abrir",
  engineAvailable: "Motor existente · experiência disponível",
  apiIntegrated: "API integrada · experiência disponível",
  contentRepository: "API integrada · conteúdo depende do repositório",
  experienceAvailable: "Experiência disponível",
  spiritualIntegrity: "Integridade da experiência",
  spiritualIntegrityDescription: "O ZION não preenche lacunas com dados espirituais fictícios. Quando um motor tem API mas ainda não tem provider ou repositório de produção, essa condição é comunicada de forma explícita.",
} as const;

type TranslationKey = keyof typeof sourceStrings;

interface TranslationContextValue {
  locale: ZionLocale;
  locales: readonly ZionLocale[];
  localeLabels: typeof ZION_LOCALE_LABELS;
  setLocale: (locale: ZionLocale) => void;
  t: (key: TranslationKey) => string;
  translateText: (text: string, contentType?: "ui" | "dynamic" | "spiritual" | "system") => Promise<string>;
  ready: boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

function readCached(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<ZionLocale>(SOURCE_LOCALE);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(readCached);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ZionLocale | null;
    if (stored && ZION_LOCALES.includes(stored)) setLocaleState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (!ready || locale === SOURCE_LOCALE) return;

    const cachedForLocale = translations[locale] ?? {};
    const items = Object.entries(sourceStrings)
      .filter(([, text]) => !cachedForLocale[`${SOURCE_LOCALE}:${locale}:ui:${text}`])
      .map(([id, text]) => ({ id, text, contentType: "ui" as const }));

    if (!items.length) return;

    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const apiUrl = process.env.NEXT_PUBLIC_ZION_API_URL;
        if (!token || !apiUrl) return;

        const response = await fetch(`${apiUrl}/v1/translation/translate/batch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceLocale: SOURCE_LOCALE,
            targetLocale: locale,
            items,
          }),
        });
        if (!response.ok) return;

        const result = (await response.json()) as {
          items?: Array<{ id: string; text: string }>;
        };
        if (!result.items?.length) return;

        setTranslations((current) => {
          const nextLocale = { ...(current[locale] ?? {}) };
          for (const item of result.items ?? []) {
            const source = sourceStrings[item.id as TranslationKey];
            if (source) nextLocale[`${SOURCE_LOCALE}:${locale}:ui:${source}`] = item.text;
          }
          const next = { ...current, [locale]: nextLocale };
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          return next;
        });
      } catch {
        // Source-language fallback remains active.
      }
    })();
  }, [locale, ready]);

  const setLocale = useCallback((next: ZionLocale) => {
    setLocaleState(next);
  }, []);

  const translateText = useCallback(async (
    text: string,
    contentType: "ui" | "dynamic" | "spiritual" | "system" = "dynamic",
  ) => {
    if (!text.trim() || locale === SOURCE_LOCALE) return text;

    const cacheKey = `${SOURCE_LOCALE}:${locale}:${contentType}:${text}`;
    const cached = translations[locale]?.[cacheKey];
    if (cached) return cached;

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_ZION_API_URL;
      if (!token || !apiUrl) return text;

      const response = await fetch(`${apiUrl}/v1/translation/translate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceLocale: SOURCE_LOCALE,
          targetLocale: locale,
          text,
          contentType,
        }),
      });
      if (!response.ok) return text;

      const result = (await response.json()) as { text?: string };
      if (!result.text) return text;

      setTranslations((current) => {
        const next = {
          ...current,
          [locale]: {
            ...(current[locale] ?? {}),
            [cacheKey]: result.text!,
          },
        };
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
      return result.text;
    } catch {
      return text;
    }
  }, [locale, translations]);

  const t = useCallback((key: TranslationKey) => {
    if (locale === SOURCE_LOCALE) return sourceStrings[key];
    return translations[locale]?.[`${SOURCE_LOCALE}:${locale}:ui:${sourceStrings[key]}`] ?? sourceStrings[key];
  }, [locale, translations]);

  const value = useMemo(() => ({
    locale,
    locales: ZION_LOCALES,
    localeLabels: ZION_LOCALE_LABELS,
    setLocale,
    t,
    translateText,
    ready,
  }), [locale, setLocale, t, translateText, ready]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useTranslation must be used inside TranslationProvider");
  return context;
}
