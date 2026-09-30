export type SupportedLocale = "pt-AO" | "pt-PT" | "en" | "fr" | "es";

export interface TranslationRequest {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  text: string;
  context?: string;
}

export interface TranslationResult {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  text: string;
  provider: string;
  translated: boolean;
}

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
}
