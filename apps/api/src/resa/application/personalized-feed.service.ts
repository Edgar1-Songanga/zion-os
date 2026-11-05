import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ResaRecommendationService } from './recommendation.service';

@Injectable()
export class ResaPersonalizedFeedService {
  private readonly db = new SupabaseRestClient();

  constructor(
    private readonly identity: IdentityService,
    private readonly recommendations: ResaRecommendationService,
  ) {}

  async getFeed(token: string, limit = 30) {
    const actor = await this.identity.getCurrentUser(token);
    const size = Math.min(Math.max(Math.floor(Number(limit) || 30), 1), 60);
    const contents = await this.db.get<any[]>(
      'resa_contents',
      token,
      '?select=id,author_id,type,title,body,visibility,language,created_at,media_type,media_url,organization_id,ministry_id,scripture_references,quoted_content_id,community_id&visibility=eq.public&order=created_at.desc&limit=160',
    );

    if (!contents.length) return [];

    const contentIds = contents.map((item) => item.id).filter(Boolean);
    const authorIds = [...new Set(contents.map((item) => item.author_id).filter(Boolean))];
    const contentFilter = `in.(${contentIds.join(',')})`;
    const authorFilter = authorIds.length ? `in.(${authorIds.join(',')})` : null;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const interestSince = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const [follows, feedback, reactions, saves, impressions, interests, contentTopics, hiddenFeedback] = await Promise.all([
      authorFilter
        ? this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${actor.id}&followed_id=${authorFilter}&limit=160`)
        : Promise.resolve([]),
      this.db.get<any[]>('resa_feed_feedback', token, `?select=content_id,feedback&user_id=eq.${actor.id}&content_id=${contentFilter}&limit=160`),
      this.db.get<any[]>('resa_reactions', token, `?select=content_id&content_id=${contentFilter}&limit=1500`),
      this.db.get<any[]>('resa_saves', token, `?select=content_id&user_id=eq.${actor.id}&content_id=${contentFilter}&limit=160`),
      this.db.get<any[]>('resa_feed_impressions', token, `?select=content_id,duration_ms,view_count,completed_count&user_id=eq.${actor.id}&content_id=${contentFilter}&viewed_on=gte.${since}&limit=3000`),
      this.db.get<any[]>('resa_feed_interest_profiles', token, `?select=interest_key,interest_score,updated_at&user_id=eq.${actor.id}&updated_at=gte.${interestSince}&limit=500`),
      this.db.get<any[]>('resa_content_topics', token, `?select=content_id,topic_id&content_id=${contentFilter}&limit=1000`),
      this.db.get<any[]>('resa_feed_feedback', token, `?select=content_id&user_id=eq.${actor.id}&feedback=eq.hide_author&limit=500`),
    ]);

    const followed = new Set(follows.map((row) => row.followed_id));
    const feedbackByContent = new Map(feedback.map((row) => [row.content_id, row.feedback]));
    const hiddenContentIds = [...new Set(hiddenFeedback.map((row) => row.content_id).filter(Boolean))];
    const previouslyHiddenAuthors = hiddenContentIds.length
      ? await this.db.get<any[]>(
          'resa_contents',
          token,
          `?select=author_id&id=in.(${hiddenContentIds.join(',')})&limit=500`,
        )
      : [];
    const hiddenAuthors = new Set([
      ...previouslyHiddenAuthors.map((row) => row.author_id),
      ...contents.filter((item) => feedbackByContent.get(item.id) === 'hide_author').map((item) => item.author_id),
    ]);
    const reactionCounts = reactions.reduce<Record<string, number>>((counts, row) => {
      counts[row.content_id] = (counts[row.content_id] ?? 0) + 1;
      return counts;
    }, {});
    const saved = new Set(saves.map((row) => row.content_id));
    const behavior = impressions.reduce<Record<string, { durationMs: number; viewCount: number; completedViews: number }>>((acc, row) => {
      const current = acc[row.content_id] ?? { durationMs: 0, viewCount: 0, completedViews: 0 };
      current.durationMs += Number(row.duration_ms) || 0;
      current.viewCount += Number(row.view_count) || 0;
      current.completedViews += Number(row.completed_count) || 0;
      acc[row.content_id] = current;
      return acc;
    }, {});
    const now = Date.now();
    const interestByKey = new Map(interests.map((row) => {
      const updatedAt = Date.parse(row.updated_at);
      const ageDays = Number.isFinite(updatedAt) ? Math.max(0, (now - updatedAt) / 86400000) : 180;
      const decay = Math.pow(0.5, ageDays / 30);
      return [row.interest_key, (Number(row.interest_score) || 0) * decay] as const;
    }));
    const topicsByContent = contentTopics.reduce<Record<string, string[]>>((acc, row) => {
      (acc[row.content_id] ??= []).push(row.topic_id);
      return acc;
    }, {});

    const ranked = this.recommendations.rank(
      contents
        .filter((item) => !hiddenAuthors.has(item.author_id) && feedbackByContent.get(item.id) !== 'report')
        .map((item) => {
          const memory = behavior[item.id] ?? { durationMs: 0, viewCount: 0, completedViews: 0 };
          const typeInterest = interestByKey.get(`type:${String(item.type).toLowerCase()}`) ?? 0;
          const topicInterest = (topicsByContent[item.id] ?? []).reduce(
            (total, topicId) => total + (interestByKey.get(`topic:${topicId}`) ?? 0),
            0,
          );
          return {
            ...item,
            followedAuthor: followed.has(item.author_id),
            interactionCount: reactionCounts[item.id] ?? 0,
            saved: saved.has(item.id),
            feedback: feedbackByContent.get(item.id),
            contentType: item.type,
            ageHours: Math.max(0, (Date.now() - Date.parse(item.created_at)) / 3600000),
            viewDurationMs: memory.durationMs,
            viewCount: memory.viewCount,
            completedViews: memory.completedViews,
            topicInterestScore: Math.min(80, typeInterest + topicInterest),
          };
        }),
    );

    const diverseRanked: typeof ranked = [];
    const authorExposure = new Map<string, number>();
    for (const item of ranked) {
      const exposure = authorExposure.get(item.author_id) ?? 0;
      if (exposure >= 3) continue;
      diverseRanked.push(item);
      authorExposure.set(item.author_id, exposure + 1);
    }

    const visibleProfiles = authorIds.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
      : [];
    const profilesById = new Map(visibleProfiles.map((profile) => [profile.id, profile]));

    return diverseRanked.slice(0, size).map((item) => {
      const profile = profilesById.get(item.author_id);
      const displayName = profile?.display_name?.trim()
        || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
        || 'Membro RESA';
      return {
        ...item,
        author_display_name: displayName,
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });
  }

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
