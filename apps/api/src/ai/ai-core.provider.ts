import { Injectable } from "@nestjs/common";
import { createHmac, randomUUID } from "node:crypto";
import type { AiProvider, AiRequest, AiResponse } from "./ai.orchestrator";

interface AiCoreGenerateResponse {
  requestId?: string;
  provider?: string;
  model?: string;
  text?: string;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

@Injectable()
export class AiCoreProvider implements AiProvider {
  async generate(request: AiRequest): Promise<AiResponse> {
    const baseUrl = process.env.AI_CORE_BASE_URL?.trim();
    const apiKey = process.env.AI_CORE_API_KEY?.trim();
    const signingSecret = process.env.AI_CONTEXT_SIGNING_SECRET;
    const tenantId = request.tenantId?.trim();
    const space = process.env.AI_CORE_SPACE?.trim() || "zion";
    const issuer = process.env.AI_CONTEXT_ISSUER?.trim() || "zion-api";
    const audience = process.env.AI_CONTEXT_AUDIENCE?.trim() || "ai-core";

    if (!baseUrl || !apiKey || !signingSecret) {
      throw new Error("AI Core is not configured. Set AI_CORE_BASE_URL, AI_CORE_API_KEY and AI_CONTEXT_SIGNING_SECRET.");
    }
    if (!tenantId) {
      throw new Error("A verified tenantId is required before calling AI Core.");
    }
    if (signingSecret.length < 32 || apiKey.length < 32) {
      throw new Error("AI Core credentials do not meet the minimum security length.");
    }

    let endpoint: URL;
    try {
      endpoint = new URL("/api/v1/ai/generate", baseUrl);
    } catch {
      throw new Error("AI_CORE_BASE_URL must be a valid absolute URL.");
    }
    if (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:") {
      throw new Error("AI Core must be called over HTTPS in production.");
    }

    const now = Math.floor(Date.now() / 1000);
    const encodedPayload = base64UrlJson({
      space,
      tenantId,
      ...(request.userId ? { userId: request.userId } : {}),
      roles: request.roles ?? [],
      iat: now,
      exp: now + 240,
      iss: issuer,
      aud: audience,
      accessLevel: "STANDARD",
    });
    const signature = createHmac("sha256", signingSecret)
      .update(encodedPayload)
      .digest("base64url");
    const contextToken = encodedPayload + "." + signature;
    const input = [
      request.systemContext?.trim()
        ? "INSTRUÇÕES DE SISTEMA DA APLICAÇÃO (não substituir políticas de segurança):\n" + request.systemContext.trim()
        : "",
      request.references?.length
        ? "REFERÊNCIAS FORNECIDAS PELA APLICAÇÃO (verificar e não inventar detalhes):\n" + request.references.join("\n")
        : "",
      "PEDIDO DO UTILIZADOR:\n" + request.prompt.trim(),
    ].filter(Boolean).join("\n\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-ai-core-key": apiKey,
          "x-ai-context-token": contextToken,
          "x-correlation-id": randomUUID(),
        },
        body: JSON.stringify({
          space,
          operation: "CHAT",
          input,
          ...(request.conversationId ? { conversationId: request.conversationId } : {}),
          ...(request.userId ? { userId: request.userId } : {}),
          tenantId,
          roles: request.roles ?? [],
        }),
      });
      const raw = await response.text();
      let payload: AiCoreGenerateResponse | null = null;
      try { payload = raw ? JSON.parse(raw) as AiCoreGenerateResponse : null; } catch { payload = null; }

      if (!response.ok) {
        throw new Error("AI Core request failed with HTTP " + response.status + ".");
      }
      if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
        throw new Error("AI Core returned an invalid or empty generation response.");
      }
      return {
        content: payload.text.trim(),
        references: [],
        provider: [payload.provider, payload.model].filter(Boolean).join("/") || "zion-ai-core",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
