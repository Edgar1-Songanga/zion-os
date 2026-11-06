"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ZION_TRANSLATION_CATALOGS } from "./catalogs";

export const ZION_LOCALES = [
  "pt-AO", "pt-PT", "en", "fr", "es", "de", "it", "zh", "ar", "sw",
  "af", "osh", "umb", "kmb", "kg", "cjk", "nyk", "lue", "mck", "kj", "ln", "am", "yo", "ha", "zu", "xh",
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
  kg: "Kikongo",
  cjk: "Cokwe",
  nyk: "Olunyaneka",
  lue: "Luvale",
  mck: "Mbunda",
  kj: "Kwangama / Kuanyama",
};

const SOURCE_LOCALE: ZionLocale = "pt-AO";
const STORAGE_KEY = "zion.locale";
const CACHE_KEY = "zion.translation.shell.v1";
const COUNTRY_DEFAULT_LOCALE: Record<string, ZionLocale> = {
  AO: "pt-AO", PT: "pt-PT", BR: "pt-PT", MZ: "pt-AO", CV: "pt-AO", GW: "pt-AO", ST: "pt-AO",
  GB: "en", US: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
  FR: "fr", BE: "fr", SN: "fr", CI: "fr", CD: "fr", CG: "fr", CM: "fr", GA: "fr", ML: "fr", NE: "fr", BF: "fr", TG: "fr", BJ: "fr", GN: "fr", TD: "fr", CF: "fr", DJ: "fr", MG: "fr", RW: "fr", BI: "fr",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es",
  DE: "de", AT: "de", CH: "de",
  IT: "it",
  CN: "zh", TW: "zh", SG: "zh",
  SA: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar", AE: "ar", QA: "ar", KW: "ar", JO: "ar", LB: "ar", IQ: "ar",
  KE: "sw", TZ: "sw",
  NA: "en", ZA: "en",
  ET: "am",
  NG: "en",
};


const sourceStrings = {
  brandDescription: "Ecossistema Digital Adventista Global",
  administrator: "Administrador",
  language: "Idioma",
  search: "Pesquisar pessoas, grupos e conteúdos",
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
  humanResources: "Recursos Humanos",
  payroll: "Payroll",
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
  gamification: "Progressão ZION",
  bibleEngineDescription: "Pesquisa, estudo e descoberta estruturada das Escrituras.",
  prayerDescription: "Pedidos, intercessão e acompanhamento de respostas em comunidade.",
  devotionDescription: "Registo real de estudo, reflexão e oração associado à conta.",
  spiritualGrowthDescription: "Linha factual de eventos espirituais e áreas de crescimento.",
  sabbathSchoolDescription: "Lições, referências bíblicas e continuidade de estudo.",
  adventistSourcesDescription: "Fontes com proveniência, autoridade e separação entre conteúdo e IA.",
  ministryDescription: "Contexto e estruturas ministeriais institucionais.",
  gamificationDescription: "Pontuação factual, progressão e convites baseados em atividade real.",
  spiritualChatDescription: "Assistência para estudo e crescimento espiritual, sem substituir as fontes.",
  resaNetwork: "Rede global · fé · comunidade · futuro",
  resaSocialExperience: "Experiência social",
  resaDescription: "Um espaço global onde espiritualidade, pessoas, serviço e tecnologia se encontram numa experiência digital viva.",
  explore: "Explorar", communitiesAction: "Comunidades", live: "Ao vivo", visualStage: "Palco visual", resaVisualArea: "Área visual principal do RESA",
  now: "Agora", communityWall: "Mural da comunidade", refresh: "Atualizar", refreshing: "A atualizar…",
  feedLoadError: "Não foi possível carregar o feed.", wallUpdateError: "Não foi possível atualizar o mural.", tryAgain: "Tentar novamente",
  emptyWallTitle: "O mural está à espera da primeira publicação", emptyWallDescription: "Partilhe uma reflexão, uma oração ou um testemunho para iniciar a conversa.",
  yourPresence: "A sua presença", authenticatedAccount: "Conta autenticada", activeResaIdentity: "Identidade RESA ativa", connectedGlobalNetwork: "Ligado à rede global",
  discover: "Descobrir", networkActivity: "Atividade da rede", exploreResa: "Explorar RESA", networkPost: "Publicação da rede", emptyDiscovery: "Ainda não existem conteúdos públicos para descobrir.",
  compatibleMedia: "Selecione uma imagem ou vídeo compatível.",
  mediaTooLarge: "O ficheiro excede o limite de 50 MB.",
  sessionUnavailable: "A sessão autenticada não está disponível.",
  publishError: "Não foi possível publicar. Tente novamente.",
  share: "Partilhar",
  sharePrompt: "O que gostaria de partilhar com a comunidade?",
  globalCommunity: "Comunidade global",
  sharePlaceholder: "Partilhe uma reflexão, oração, testemunho ou estudo bíblico…",
  previewPublication: "Pré-visualização da publicação",
  publishing: "A publicar…",
  publish: "Publicar",
  publicationOnResa: "Publicação no RESA",
  copied: "Ligação copiada.",
  copyPrompt: "Copiar ligação da publicação",
  shareWindowOpened: "Janela de partilha aberta.",
  openConversation: "Abrir conversa",
  resaProfile: "Perfil RESA",
  publishedOnResa: "Publicado no RESA",
  message: "Mensagem",
  call: "Chamada",
  liked: "Gostou",
  like: "Gostar",
  saving: "A guardar…",
  save: "Guardar",
  reposting: "A republicar…",
  repost: "Republicar",
  sharePublication: "Partilhar publicação",
  shareBeyondResa: "Partilhar fora do RESA",
  moreOptions: "Mais opções",
  cannotCopy: "Não foi possível copiar a ligação.",
  copyLink: "Copiar ligação",
  commentPlaceholder: "Escreva um comentário…",
  dashEyebrow: "ZION OS · A TUA JORNADA",
  dashHeroTitle: "Um lugar para aprender, pertencer e crescer.",
  dashHeroDescription: "Encontra inspiração nas Escrituras, aprende ao teu ritmo e transforma boas ideias em gestos concretos na tua vida e comunidade.",
  dashStartBible: "Começar uma jornada bíblica",
  dashDiscoverCommunity: "Descobrir a comunidade",
  dashBenefitLearn: "Aprende com contexto e referências",
  dashBenefitPace: "Avança ao teu próprio ritmo",
  dashBenefitCommunity: "Cresce em comunidade",
  dashNextStep: "Um próximo passo possível",
  dashAttentionTitle: "Pensa no que merece ocupar a tua atenção.",
  dashReading: "Leitura sugerida:",
  dashReadingPrompt: "Lê a passagem com calma e pergunta a ti próprio: que pensamento bom posso alimentar e pôr em prática hoje?",
  dashOpenBibleEngine: "Abrir o Bible Engine",
  dashManyPaths: "Uma experiência, muitos caminhos",
  dashFaithCommunity: "A tua fé também cresce em comunidade.",
  dashShareCommunity: "Partilha uma reflexão, acompanha uma conversa ou encontra um espaço onde possas aprender com outras pessoas.",
  dashEnterCommunity: "Entrar na comunidade",
  dashExploreZion: "Explora a ZION",
  dashChooseNext: "Escolhe o teu próximo passo.",
  dashNoRush: "Não precisas de fazer tudo hoje. Escolhe aquilo que é útil para ti neste momento.",
  dashLearn: "APRENDER",
  dashLearnDesc: "Explora as Escrituras, responde a perguntas e consolida o que aprendeste.",
  dashContinue: "Continuar a jornada",
  dashReflect: "REFLETIR",
  dashDevotion: "Estudo e devoção",
  dashDevotionDesc: "Reserva um momento para ler, refletir e registar o que levas contigo.",
  dashOpenDevotion: "Abrir devoção",
  dashBelong: "PERTENCER",
  dashCommunity: "Comunidade",
  dashCommunityDesc: "Descobre conversas, partilha experiências e cresce com outras pessoas.",
  dashFindCommunity: "Encontrar comunidade",
  dashPray: "ORAR",
  dashPrayer: "Oração",
  dashPrayerDesc: "Encontra um espaço para pedidos de oração, intercessão e apoio mútuo.",
  dashPrayerAction: "Entrar no espaço de oração",
  dashStudyTogether: "ESTUDAR EM CONJUNTO",
  dashSabbath: "Escola Sabatina",
  dashSabbathDesc: "Aprofunda temas bíblicos e acompanha a aprendizagem em comunidade.",
  dashExploreStudies: "Explorar estudos",
  dashGrow: "CRESCER",
  dashJourney: "Jornada espiritual",
  dashJourneyDesc: "Consulta os espaços de acompanhamento e reflexão da tua caminhada.",
  dashViewJourney: "Ver jornada",
  dashClosing: "A tua jornada não é uma corrida. Avança ao teu ritmo e leva contigo aquilo que faz sentido.",
} as const;

type TranslationKey = keyof typeof sourceStrings;

interface TranslationContextValue {
  locale: ZionLocale;
  locales: readonly ZionLocale[];
  localeLabels: typeof ZION_LOCALE_LABELS;
  setLocale: (locale: ZionLocale) => void;
  t: (key: TranslationKey) => string;
  translateText: (text: string, contentType?: "ui" | "dynamic" | "spiritual" | "system") => Promise<string>;
  dynamicTranslationUnavailable: boolean;
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

export function TranslationProvider({ children, countryCode }: { children: React.ReactNode; countryCode?: string | null }) {
  const [locale, setLocaleState] = useState<ZionLocale>(SOURCE_LOCALE);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(readCached);
  const [ready, setReady] = useState(false);
  const [dynamicTranslationUnavailable, setDynamicTranslationUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const isLocale = (value: unknown): value is ZionLocale =>
      typeof value === "string" && (ZION_LOCALES as readonly string[]).includes(value);

    const restorePreference = async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const preferred = data.user?.user_metadata?.preferred_locale;
        if (!active) return;
        if (isLocale(preferred)) {
          setLocaleState(preferred);
          window.localStorage.setItem(STORAGE_KEY, preferred);
        } else if (isLocale(stored)) {
          setLocaleState(stored);
        } else {
          const countryLocale = countryCode ? COUNTRY_DEFAULT_LOCALE[countryCode.toUpperCase()] : undefined;
          const browserLanguage = navigator.languages?.find((candidate) => {
            const normalized = candidate.toLowerCase();
            return ZION_LOCALES.some((supported) =>
              normalized === supported.toLowerCase() || normalized.startsWith(`${supported.toLowerCase()}-`),
            );
          });
          const suggested = countryLocale ?? (browserLanguage as ZionLocale | undefined) ?? SOURCE_LOCALE;
          setLocaleState(suggested);
          window.localStorage.setItem(STORAGE_KEY, suggested);
        }
      } catch {
        if (active && isLocale(stored)) setLocaleState(stored);
      } finally {
        if (active) setReady(true);
      }
    };

    void restorePreference();
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      const preferred = session?.user?.user_metadata?.preferred_locale;
      if (isLocale(preferred)) {
        setLocaleState(preferred);
        window.localStorage.setItem(STORAGE_KEY, preferred);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [countryCode]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("data-zion-locale", locale);
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: ZionLocale) => {
    setDynamicTranslationUnavailable(false);
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);

    // Persist the preference in the authenticated account so it follows the
    // member across browsers and devices; local storage remains an offline fallback.
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { error } = await supabase.auth.updateUser({
          data: { preferred_locale: next },
        });
        if (error) {
          console.error("[ZION i18n] Could not persist the language preference to the account.", error);
        }
      } catch (error) {
        console.error("[ZION i18n] Language preference persistence failed.", error);
      }
    })();
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
      if (!token || !apiUrl) {
        console.warn("[ZION i18n] Dynamic translation requires an authenticated session and NEXT_PUBLIC_ZION_API_URL.");
        setDynamicTranslationUnavailable(true);
        return text;
      }

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
      if (!response.ok) {
        console.error(`[ZION i18n] Translation API returned HTTP ${response.status}.`);
        setDynamicTranslationUnavailable(true);
        return text;
      }

      const result = (await response.json()) as { text?: string };
      if (!result.text) {
        setDynamicTranslationUnavailable(true);
        return text;
      }

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
      setDynamicTranslationUnavailable(false);
      return result.text;
    } catch (error) {
      console.error("[ZION i18n] Dynamic translation failed; showing source text.", error);
      setDynamicTranslationUnavailable(true);
      return text;
    }
  }, [locale, translations]);

  const t = useCallback((key: TranslationKey): string => {
    const sourceText: string = sourceStrings[key];
    if (locale === SOURCE_LOCALE) return sourceText;
    const catalog: Record<string, string> = ZION_TRANSLATION_CATALOGS[locale] ?? {};
    const cached = translations[locale]?.[`${SOURCE_LOCALE}:${locale}:ui:${sourceText}`];
    return catalog[key] ?? cached ?? sourceText;
  }, [locale, translations]);

  const value = useMemo(() => ({
    locale,
    locales: ZION_LOCALES,
    localeLabels: ZION_LOCALE_LABELS,
    setLocale,
    t,
    translateText,
    dynamicTranslationUnavailable,
    ready,
  }), [locale, setLocale, t, translateText, dynamicTranslationUnavailable, ready]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useTranslation must be used inside TranslationProvider");
  return context;
}
