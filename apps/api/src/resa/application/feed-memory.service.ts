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

  async resetMemory(token: string) {
    await this.identity.getCurrentUser(token);
    await this.db.rpc('reset_resa_feed_memory', token, {});
    return { reset: true };
  }
}
