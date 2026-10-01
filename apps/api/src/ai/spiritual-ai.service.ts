import { Injectable } from "@nestjs/common";
import { AiOrchestrator, type AiRequest } from "./ai.orchestrator";

@Injectable()
export class SpiritualAiService {
  constructor(private readonly ai: AiOrchestrator) {}

  async enhance(request: AiRequest & { canonicalReferences?: string[] }) {
    const references = [...new Set(request.canonicalReferences ?? request.references ?? [])];
    const result = await this.ai.generate({
      ...request,
      references,
      systemContext: [
        request.systemContext ?? "",
        "ZION spiritual AI must distinguish canonical Adventist sources from commentary and user-generated material.",
        "Do not fabricate Bible text, doctrine, official statements, or source citations.",
      ].filter(Boolean).join("\n"),
    });
    return { ...result, canonicalReferences: references };
  }
}
