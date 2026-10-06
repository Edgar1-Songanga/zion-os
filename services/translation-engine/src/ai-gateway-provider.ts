import type { TranslationBatchRequest, TranslationBatchResult, TranslationProvider, TranslationRequest, TranslationResult } from "./types";

export interface AIGatewayTranslationConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
}

function systemPrompt(source: string, target: string, contentType = "system"): string {
  return [
    "You are ZION OS's production translation layer.",
    `Translate from ${source} to ${target}.`,
    `Content type: ${contentType}.`,
    "Preserve meaning, placeholders, URLs, Bible references, product names, organization names, and markup tokens.",
    "Do not invent facts, doctrine, citations, or names.",
    "Return only the translated text.",
  ].join(" ");
}

export class AIGatewayTranslationProvider implements TranslationProvider {
  constructor(private readonly config: AIGatewayTranslationConfig) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const endpoint = this.config.endpoint ?? "https://ai-gateway.vercel.sh/v1/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt(request.sourceLocale, request.targetLocale, request.contentType) },
          { role: "user", content: request.text },
        ],
      }),
    });

    const raw = await response.text();
    let payload: any;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }
    if (!response.ok) throw new Error(`Translation provider failed: ${response.status}`);
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("Translation provider returned no text.");

    return {
      sourceLocale: request.sourceLocale,
      targetLocale: request.targetLocale,
      text: text.trim(),
      provider: "vercel-ai-gateway",
      translated: true,
    };
  }

  async translateBatch(request: TranslationBatchRequest): Promise<TranslationBatchResult> {
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
      provider: "vercel-ai-gateway",
    };
  }
}
