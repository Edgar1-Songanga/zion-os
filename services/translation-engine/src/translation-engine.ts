import type { TranslationProvider, TranslationRequest, TranslationResult } from "./types";

export class TranslationEngine {
  constructor(private readonly provider: TranslationProvider) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const text = request.text.trim();
    if (!text) throw new Error("Translation text cannot be empty.");
    if (request.sourceLocale === request.targetLocale) {
      return {
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        text,
        provider: "identity",
        translated: false,
      };
    }
    return this.provider.translate({ ...request, text });
  }
}
