import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class ResaFeedMemoryService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async recordImpression(token: string, contentId: string, durationMs: number, completed: boolean) {
    await this.identity.getCurrentUser(token);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contentId)) {
      throw new BadRequestException('Invalid content identifier');
    }
    const duration = Math.min(Math.max(Math.floor(durationMs), 1000), 300000);
    await this.db.rpc('record_resa_feed_impression', token, {
      p_content_id: contentId,
      p_duration_ms: duration,
      p_completed: Boolean(completed && duration >= 10000),
    });
    return { recorded: true };
  }

  async creatorAnalytics(token: string, from?: string, to?: string) {
    await this.identity.getCurrentUser(token);
    const today = new Date().toISOString().slice(0, 10);
    const end = to ?? today;
    const start = from ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    const span = (Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) / 86400000;
    if (!validDate(start) || !validDate(end) || span < 0 || span > 89 || end > today) {
      throw new BadRequestException('Analytics period must be a valid range of up to 90 days ending today or earlier');
    }
    const items = await this.db.rpc<any[]>('resa_creator_analytics', token, {
      p_from: start,
      p_to: end,
    });
    return {
      from: start,
      to: end,
      privacy_threshold: 5,
      items: items ?? [],
    };
  }

  async resetMemory(token: string) {
    await this.identity.getCurrentUser(token);
    await this.db.rpc('reset_resa_feed_memory', token, {});
    return { reset: true };
  }
}
