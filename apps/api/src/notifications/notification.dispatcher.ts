import type { Notification } from "../notifications/notification.engine";

export interface NotificationSink {
  deliver(notification: Notification): Promise<void>;
}

export class NotificationDispatcher {
  private readonly delivered = new Set<string>();
  constructor(private readonly sink?: NotificationSink) {}

  async dispatch(notification: Notification): Promise<{ delivered: boolean; idempotent: boolean }> {
    if (this.delivered.has(notification.id)) return { delivered: false, idempotent: true };
    if (!this.sink) return { delivered: false, idempotent: false };
    await this.sink.deliver(notification);
    this.delivered.add(notification.id);
    return { delivered: true, idempotent: false };
  }
}
