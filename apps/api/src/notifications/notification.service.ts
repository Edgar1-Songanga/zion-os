import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

@Injectable()
export class NotificationService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  async list(token: string, unreadOnly = false, limit = 50) {
    const actor = await this.identity.getCurrentUser(token);
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const unread = unreadOnly ? '&read_at=is.null' : '';
    return this.db.get('notifications', token, `?select=*&user_id=eq.${actor.id}${unread}&order=created_at.desc&limit=${size}`);
  }

  async markRead(token: string, notificationId: string) {
    const actor = await this.identity.getCurrentUser(token);
    const rows = await this.db.patch<any[]>('notifications', token, { read_at: new Date().toISOString() }, `?id=eq.${notificationId}&user_id=eq.${actor.id}`);
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return rows[0];
  }

  async markAllRead(token: string) {
    const actor = await this.identity.getCurrentUser(token);
    await this.db.patch('notifications', token, { read_at: new Date().toISOString() }, `?user_id=eq.${actor.id}&read_at=is.null`);
    return { updated: true };
  }

  async preferences(token: string) {
    const actor = await this.identity.getCurrentUser(token);
    const rows = await this.db.get<any[]>('notification_preferences', token, `?select=*&user_id=eq.${actor.id}&limit=1`);
    return rows[0] ?? { user_id: actor.id, enabled: true, channels: ['in_app'], muted_types: [], quiet_start: null, quiet_end: null };
  }

  async updatePreferences(token: string, input: { enabled?: unknown; channels?: unknown; muted_types?: unknown; quiet_start?: unknown; quiet_end?: unknown }) {
    const actor = await this.identity.getCurrentUser(token);
    const body: Record<string, unknown> = { user_id: actor.id };
    if (input.enabled !== undefined) { if (typeof input.enabled !== 'boolean') throw new BadRequestException('enabled must be boolean'); body.enabled = input.enabled; }
    if (input.channels !== undefined) { if (!Array.isArray(input.channels) || input.channels.some((channel) => !['in_app', 'push', 'email'].includes(String(channel)))) throw new BadRequestException('channels is invalid'); body.channels = input.channels; }
    if (input.muted_types !== undefined) { if (!Array.isArray(input.muted_types)) throw new BadRequestException('muted_types is invalid'); body.muted_types = input.muted_types.map((type) => String(type).trim()).filter(Boolean).slice(0, 100); }
    for (const key of ['quiet_start', 'quiet_end'] as const) if (input[key] !== undefined) body[key] = input[key] || null;
    const rows = await this.db.upsert<any[]>('notification_preferences', token, body, '?on_conflict=user_id');
    return rows[0];
  }
}
