export type SupportedLocale =
  | "pt-AO" | "pt-PT" | "en" | "fr" | "es" | "de" | "it" | "zh"
  | "ar" | "sw" | "af" | "osh" | "umb" | "kmb" | "kg" | "cjk"
  | "nyk" | "lue" | "mck" | "kj" | "ln" | "am" | "yo" | "ha" | "zu" | "xh";

export type TranslationContentType =
  | "ui"
  | "navigation"
  | "notification"
  | "spiritual"
  | "resa"
  | "governance"
  | "marketplace"
  | "profile"
  | "system"
  | "dynamic";

export interface TranslationRequest {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  text: string;
  context?: string;
  contentType?: TranslationContentType;
  preserveTokens?: string[];
}

export interface TranslationBatchRequest {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  items: Array<{
    id: string;
    text: string;
    context?: string;
    contentType?: TranslationContentType;
  }>;
}

export interface TranslationResult {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  text: string;
  provider: string;
  translated: boolean;
  cached?: boolean;
}

export interface TranslationBatchResult {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  items: Array<TranslationResult & { id: string }>;
  provider: string;
}

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
  translateBatch?(request: TranslationBatchRequest): Promise<TranslationBatchResult>;
}
