import { Module } from "@nestjs/common";
import { NotificationEngine } from "./notification.engine";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [NotificationController],
  providers: [NotificationEngine, NotificationService],
  exports: [NotificationEngine, NotificationService],
})
export class NotificationsModule {}
