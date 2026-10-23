import { Module } from "@nestjs/common";
import { AiCoreProvider } from "./ai-core.provider";
import { AI_PROVIDER, AiOrchestrator } from "./ai.orchestrator";
import { SpiritualAiService } from "./spiritual-ai.service";

@Module({
  providers: [
    AiCoreProvider,
    { provide: AI_PROVIDER, useExisting: AiCoreProvider },
    AiOrchestrator,
    SpiritualAiService,
  ],
  exports: [AiOrchestrator, SpiritualAiService],
})
export class AiModule {}
