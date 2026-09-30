export type NotificationChannel = "in_app" | "push" | "email";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export interface Notification { id: string; userId: string; type: string; title: string; body: string; channel: NotificationChannel; priority: NotificationPriority; data?: Record<string, unknown>; createdAt: string; readAt?: string; }
export interface NotificationPreferences { userId: string; enabled: boolean; channels: NotificationChannel[]; mutedTypes?: string[]; quietHours?: { start: string; end: string }; }
export class NotificationEngine {
  shouldDeliver(notification: Pick<Notification, "type" | "channel">, preferences: NotificationPreferences): boolean {
    return preferences.enabled && preferences.channels.includes(notification.channel) && !(preferences.mutedTypes ?? []).includes(notification.type);
  }
  create(input: Omit<Notification, "id" | "createdAt">): Notification { return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }; }
}
