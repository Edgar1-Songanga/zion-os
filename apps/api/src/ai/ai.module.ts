import { Module } from "@nestjs/common";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import { IdentityModule } from "../identity/identity.module";
import { AiController } from "./ai.controller";
import { AiCoreProvider } from "./ai-core.provider";
import { AI_PROVIDER, AiOrchestrator } from "./ai.orchestrator";
import { SpiritualAiService } from "./spiritual-ai.service";

@Module({
  imports: [IdentityModule],
  controllers: [AiController],
  providers: [
    SupabaseRestClient,
    AiCoreProvider,
    { provide: AI_PROVIDER, useExisting: AiCoreProvider },
    AiOrchestrator,
    SpiritualAiService,
  ],
  exports: [AiOrchestrator, SpiritualAiService],
})
export class AiModule {}
