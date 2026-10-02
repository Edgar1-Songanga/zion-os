import { Injectable } from "@nestjs/common";
import { Notification } from "./notification.engine";
import { EmailNotificationSink } from "./email-notification.sink";

@Injectable()
export class NotificationDeliveryService {
  private readonly email = new EmailNotificationSink();

  async deliver(notification: Notification, recipientEmail: string | null) {
    if (notification.channel !== "email") {
      return { delivered: false, channel: notification.channel, reason: "provider_not_configured" };
    }

    if (!recipientEmail) {
      return { delivered: false, channel: "email", reason: "recipient_email_missing" };
    }

    await this.email.deliver(notification, { email: recipientEmail });
    return { delivered: true, channel: "email" };
  }
}
