import { Optional } from "@nestjs/common";

export interface AiRequest {
  userId?: string;
  prompt: string;
  systemContext?: string;
  references?: string[];
}
export interface AiResponse { content: string; references: string[]; provider: string; }
export interface AiProvider { generate(request: AiRequest): Promise<AiResponse>; }

export class AiOrchestrator {
  constructor(@Optional() private readonly provider?: AiProvider) {}

  async generate(request: AiRequest): Promise<AiResponse> {
    const prompt = request.prompt.trim();
    if (!prompt) throw new Error("AI prompt is required.");
    if (!this.provider) return { content: "", references: request.references ?? [], provider: "none" };
    const result = await this.provider.generate({ ...request, prompt });
    return { ...result, references: [...new Set([...(request.references ?? []), ...result.references])] };
  }
}
