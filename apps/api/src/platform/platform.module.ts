import { Module } from "@nestjs/common";
import { PlatformEngine } from "./platform.engine";
import { PlatformService } from "./platform.service";
import { PlatformController } from "./platform.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [PlatformController],
  providers: [PlatformEngine, PlatformService],
  exports: [PlatformEngine, PlatformService],
})
export class PlatformModule {}
