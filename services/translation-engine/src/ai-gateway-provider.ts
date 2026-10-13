import type { TranslationBatchRequest, TranslationBatchResult, TranslationProvider, TranslationRequest, TranslationResult } from "./types.js";

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
    if (request.items.length > 50) throw new Error("Translation batch cannot contain more than 50 items.");
    if (request.items.some((item) => !item.id.trim() || !item.text.trim() || item.text.length > 4000)) {
      throw new Error("Translation batch contains an invalid item.");
    }
    const ids = new Set(request.items.map((item) => item.id));
    if (ids.size !== request.items.length) throw new Error("Translation batch item ids must be unique.");

    const endpoint = this.config.endpoint ?? "https://ai-gateway.vercel.sh/v1/chat/completions";
    const outputSchema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, text: { type: "string" } },
            required: ["id", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    };
    const payload = {
      model: this.config.model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: "zion_translation_batch", strict: true, schema: outputSchema },
      },
      messages: [
        {
          role: "system",
          content: [
            "You are ZION OS's production localization layer.",
            `Translate each item from ${request.sourceLocale} to ${request.targetLocale}.`,
            "Return one item for every input id, preserving ids exactly and in the same order.",
            "Respect each item's contentType and context.",
            "Preserve meaning, placeholders, URLs, Bible references, product names, and markup tokens.",
            "Do not invent facts, doctrine, citations, or names.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify({ items: request.items }) },
      ],
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    let envelope: any;
    try { envelope = raw ? JSON.parse(raw) : null; } catch { envelope = null; }
    if (!response.ok) throw new Error(`Translation provider failed: ${response.status}`);
    const content = envelope?.choices?.[0]?.message?.content;
    let parsed: any;
    try { parsed = typeof content === "string" ? JSON.parse(content) : null; } catch { parsed = null; }
    const results = parsed?.items;
    if (!Array.isArray(results) || results.length !== request.items.length) {
      throw new Error("Translation provider returned an incomplete batch.");
    }
    const byId = new Map<string, string>();
    for (const item of results) {
      if (typeof item?.id !== "string" || typeof item?.text !== "string" || !item.text.trim() || byId.has(item.id)) {
        throw new Error("Translation provider returned an invalid batch item.");
      }
      byId.set(item.id, item.text.trim());
    }
    if (request.items.some((item) => !byId.has(item.id))) {
      throw new Error("Translation provider changed or omitted batch item ids.");
    }
    const items = request.items.map((item) => ({
      id: item.id,
      sourceLocale: request.sourceLocale,
      targetLocale: request.targetLocale,
      text: byId.get(item.id)!,
      provider: "vercel-ai-gateway",
      translated: true,
    }));
    return {
      sourceLocale: request.sourceLocale,
      targetLocale: request.targetLocale,
      items,
      provider: "vercel-ai-gateway",
    };
  }
}
