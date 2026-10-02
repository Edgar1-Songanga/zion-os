import type { Notification } from "./notification.engine";

export interface EmailNotificationRecipient {
  email: string;
}

export class EmailNotificationSink {
  private readonly apiKey = process.env.RESEND_API_KEY ?? "";
  private readonly from = process.env.ZION_NOTIFICATION_EMAIL_FROM ?? "";

  async deliver(notification: Notification, recipient: EmailNotificationRecipient): Promise<void> {
    if (!this.apiKey) throw new Error("RESEND_API_KEY is not configured");
    if (!this.from) throw new Error("ZION_NOTIFICATION_EMAIL_FROM is not configured");
    if (!recipient.email) throw new Error("Notification recipient email is missing");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [recipient.email],
        subject: notification.title,
        text: notification.body,
        tags: [{ name: "zion_notification_id", value: notification.id }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend email delivery failed (${response.status}): ${detail.slice(0, 500)}`);
    }
  }
}
