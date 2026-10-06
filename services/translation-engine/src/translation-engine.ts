import type {
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "./types";

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

  async translateBatch(request: TranslationBatchRequest): Promise<TranslationBatchResult> {
    if (!request.items.length) {
      return { sourceLocale: request.sourceLocale, targetLocale: request.targetLocale, items: [], provider: "identity" };
    }
    if (request.sourceLocale === request.targetLocale) {
      return {
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        items: request.items.map((item) => ({
          id: item.id,
          sourceLocale: request.sourceLocale,
          targetLocale: request.targetLocale,
          text: item.text.trim(),
          provider: "identity",
          translated: false,
        })),
        provider: "identity",
      };
    }
    if (this.provider.translateBatch) return this.provider.translateBatch(request);
    const items = await Promise.all(request.items.map(async (item) => ({
      id: item.id,
      ...(await this.translate({
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        text: item.text,
        context: item.context,
        contentType: item.contentType,
      })),
    })));
    return {
      sourceLocale: request.sourceLocale,
      targetLocale: request.targetLocale,
      items,
      provider: items[0]?.provider ?? "unknown",
    };
  }
}
