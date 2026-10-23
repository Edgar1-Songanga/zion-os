import { Inject, Optional } from "@nestjs/common";

export const AI_PROVIDER = "AI_PROVIDER";

export interface AiRequest {
  userId?: string;
  tenantId?: string;
  roles?: string[];
  conversationId?: string;
  prompt: string;
  systemContext?: string;
  references?: string[];
}
export interface AiResponse { content: string; references: string[]; provider: string; }
export interface AiProvider { generate(request: AiRequest): Promise<AiResponse>; }

export class AiOrchestrator {
  constructor(@Optional() @Inject(AI_PROVIDER) private readonly provider?: AiProvider) {}

  async generate(request: AiRequest): Promise<AiResponse> {
    const prompt = request.prompt.trim();
    if (!prompt) throw new Error("AI prompt is required.");
    if (!this.provider) throw new Error("AI provider is not registered.");
    const result = await this.provider.generate({ ...request, prompt });
    return { ...result, references: [...new Set([...(request.references ?? []), ...result.references])] };
  }
}
