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
    const [notifications, mutes] = await Promise.all([
      this.db.get<any[]>('notifications', token, `?select=*&user_id=eq.${actor.id}${unread}&order=created_at.desc&limit=${Math.min(size * 10, 1000)}`),
      this.db.get<any[]>('resa_user_mutes', token, `?select=muted_id&muter_id=eq.${actor.id}&limit=1000`),
    ]);
    const mutedIds = new Set(mutes.map((row) => row.muted_id));
    return notifications
      .filter((notification) => !notification.data?.actor_id || !mutedIds.has(notification.data.actor_id))
      .slice(0, size);
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
    const [rows, profiles] = await Promise.all([
      this.db.get<any[]>('notification_preferences', token, `?select=*&user_id=eq.${actor.id}&limit=1`),
      this.db.get<any[]>('profiles', token, `?select=timezone&id=eq.${actor.id}&limit=1`),
    ]);
    return {
      ...(rows[0] ?? { user_id: actor.id, enabled: true, channels: ['in_app'], muted_types: [], quiet_start: null, quiet_end: null, sound_enabled: true, vibration_enabled: true, sound_style: 'soft' }),
      timezone: profiles[0]?.timezone || 'UTC',
    };
  }

  async updatePreferences(token: string, input: { enabled?: unknown; channels?: unknown; muted_types?: unknown; quiet_start?: unknown; quiet_end?: unknown; sound_style?: unknown; sound_enabled?: unknown; vibration_enabled?: unknown }) {
    const actor = await this.identity.getCurrentUser(token);
    const body: Record<string, unknown> = { user_id: actor.id };
    if (input.enabled !== undefined) { if (typeof input.enabled !== 'boolean') throw new BadRequestException('enabled must be boolean'); body.enabled = input.enabled; }
    if (input.channels !== undefined) { if (!Array.isArray(input.channels) || input.channels.some((channel) => !['in_app', 'push', 'email'].includes(String(channel)))) throw new BadRequestException('channels is invalid'); body.channels = input.channels; }
    if (input.muted_types !== undefined) { if (!Array.isArray(input.muted_types)) throw new BadRequestException('muted_types is invalid'); body.muted_types = input.muted_types.map((type) => String(type).trim()).filter(Boolean).slice(0, 100); }
    for (const key of ['quiet_start', 'quiet_end'] as const) {
      if (input[key] === undefined) continue;
      const value = input[key];
      if (value === null || value === '') { body[key] = null; continue; }
      if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
        throw new BadRequestException(`${key} must use HH:MM format`);
      }
      body[key] = value;
    }
    for (const key of ['sound_enabled', 'vibration_enabled'] as const) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== 'boolean') throw new BadRequestException(`${key} must be boolean`);
      body[key] = input[key];
    }
    if (input.sound_style !== undefined) { if (!['soft', 'chime', 'classic', 'silent'].includes(String(input.sound_style))) throw new BadRequestException('sound_style is invalid'); body.sound_style = input.sound_style; }
    const rows = await this.db.upsert<any[]>('notification_preferences', token, body, '?on_conflict=user_id');
    return rows[0];
  }
}
