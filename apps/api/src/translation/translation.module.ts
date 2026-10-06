import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { TranslationController } from "./translation.controller";
import { TranslationService } from "./translation.service";

@Module({
  imports: [IdentityModule],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
