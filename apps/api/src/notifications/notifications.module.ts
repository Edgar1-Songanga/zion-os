import { Module } from "@nestjs/common";
import { NotificationEngine } from "./notification.engine";
@Module({ providers: [NotificationEngine], exports: [NotificationEngine] })
export class NotificationsModule {}
