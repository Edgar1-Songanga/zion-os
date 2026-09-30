import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuditModule } from "./audit/audit.module";
import { GovernanceModule } from "./governance/governance.module";
import { IdentityModule } from "./identity/identity.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PlatformModule } from "./platform/platform.module";
import { ResaModule } from "./resa/resa.module";
import { SpiritualModule } from "./spiritual/spiritual.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { UsersModule } from "./users/users.module";
import { MediaModule } from "./media/media.module";
import { HealthController } from "./platform/health.controller";

@Module({
  imports: [PlatformModule, IdentityModule, SpiritualModule, ResaModule, NotificationsModule, AiModule, OrganizationsModule, GovernanceModule, AuditModule, UsersModule, MediaModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
