import { Module } from "@nestjs/common";
import { AiOrchestrator } from "./ai.orchestrator";
import { SpiritualAiService } from "./spiritual-ai.service";

@Module({ providers: [AiOrchestrator, SpiritualAiService], exports: [AiOrchestrator, SpiritualAiService] })
export class AiModule {}
