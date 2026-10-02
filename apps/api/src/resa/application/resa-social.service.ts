import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ResaRecommendationService } from './recommendation.service';

@Injectable()
export class ResaSocialService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService, private readonly recommendations: ResaRecommendationService) {}
  private async actor(token: string) { return this.identity.getCurrentUser(token); }
  private clean(value: unknown, field: string, max = 10000) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required`);
    const v = value.trim(); if (v.length > max) throw new BadRequestException(`${field} is too long`); return v;
  }
  async listContent(token: string, limit = 30, before?: string) {
    await this.actor(token); const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filter = before ? `&created_at=lt.${encodeURIComponent(before)}` : '';
    return this.db.get('resa_contents', token, `?select=*&order=created_at.desc&limit=${size}${filter}`);
  }
  async feed(token: string, limit = 30) {
    const a = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const [contents, follows, feedback, reactions, saves] = await Promise.all([
      this.db.get<any[]>('resa_contents', token, '?select=*&visibility=eq.public&order=created_at.desc&limit=150'),
      this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${a.id}`),
      this.db.get<any[]>('resa_feed_feedback', token, `?select=content_id,feedback&user_id=eq.${a.id}`),
      this.db.get<any[]>('resa_reactions', token, '?select=content_id'),
      this.db.get<any[]>('resa_saves', token, `?select=content_id&user_id=eq.${a.id}`),
    ]);
    const followed = new Set(follows.map((row) => row.followed_id));
    const hidden = new Map(feedback.map((row) => [row.content_id, row.feedback]));
    const reactionCounts = reactions.reduce<Record<string, number>>((counts, row) => {
      counts[row.content_id] = (counts[row.content_id] ?? 0) + 1;
      return counts;
    }, {});
    const saved = new Set(saves.map((row) => row.content_id));
    const ranked = this.recommendations.rank(contents.map((item) => ({
      ...item,
      followedAuthor: followed.has(item.author_id),
      interactionCount: reactionCounts[item.id] ?? 0,
      saved: saved.has(item.id),
      feedback: hidden.get(item.id),
      contentType: item.type,
      ageHours: Math.max(0, (Date.now() - Date.parse(item.created_at)) / 3600000),
    })));
    return ranked.slice(0, size);
  }

  async explore(token: string, query?: string, limit = 30) {
    await this.actor(token); const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filter = query?.trim() ? `&or=(title.ilike.*${encodeURIComponent(query.trim())}*,body.ilike.*${encodeURIComponent(query.trim())}*)` : '';
    return this.db.get('resa_contents', token, `?select=*&visibility=eq.public&order=created_at.desc&limit=${size}${filter}`);
  }
  async stories(token: string, limit = 30) {
    await this.actor(token); const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    return this.db.get('resa_contents', token, `?select=*&type=eq.story&visibility=eq.public&created_at=gte.${encodeURIComponent(new Date(Date.now() - 86400000).toISOString())}&order=created_at.desc&limit=${size}`);
  }
  async createContent(token: string, input: any) {
    const a = await this.actor(token); const type = this.clean(input.type, 'type', 40); const visibility = input.visibility || 'public';
    if (!['public', 'followers', 'community', 'organization', 'private'].includes(visibility)) throw new BadRequestException('Invalid visibility');
    const body = { author_id: a.id, type, title: typeof input.title === 'string' ? input.title.trim() || null : null, body: typeof input.body === 'string' ? input.body.trim() || null : null, visibility, language: typeof input.language === 'string' && input.language.trim() ? input.language.trim() : 'pt', organization_id: input.organization_id ?? null, ministry_id: input.ministry_id ?? null, scripture_references: Array.isArray(input.scripture_references) ? input.scripture_references.slice(0, 50) : [] };
    if (!body.body && !body.title) throw new BadRequestException('title or body is required');
    const rows = await this.db.post<any[]>('resa_contents', token, body); return rows[0];
  }
  async comment(token: string, contentId: string, input: { body: string; parent_id?: string | null }) {
    const a = await this.actor(token); const rows = await this.db.post<any[]>('resa_comments', token, { content_id: contentId, author_id: a.id, body: this.clean(input.body, 'body', 5000), parent_id: input.parent_id ?? null }); return rows[0];
  }
  async comments(token: string, contentId: string) { await this.actor(token); return this.db.get('resa_comments', token, `?select=*&content_id=eq.${contentId}&status=eq.active&order=created_at.asc`); }
  async react(token: string, contentId: string, reactionType: string) { const a = await this.actor(token); const rows = await this.db.upsert<any[]>('resa_reactions', token, { content_id: contentId, user_id: a.id, reaction_type: this.clean(reactionType, 'reaction_type', 40).toLowerCase() }, '?on_conflict=content_id,user_id'); return rows[0]; }
  async removeReaction(token: string, contentId: string) { const a = await this.actor(token); await this.db.delete('resa_reactions', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`); return { removed: true }; }
  async follow(token: string, followedId: string) { const a = await this.actor(token); if (a.id === followedId) throw new BadRequestException('You cannot follow yourself'); const rows = await this.db.post<any[]>('resa_follows', token, { follower_id: a.id, followed_id: followedId }); return rows[0]; }
  async unfollow(token: string, followedId: string) { const a = await this.actor(token); await this.db.delete('resa_follows', token, `?follower_id=eq.${a.id}&followed_id=eq.${followedId}`); return { removed: true }; }
  async follows(token: string, userId?: string) { const a = await this.actor(token); return this.db.get('resa_follows', token, `?select=*&follower_id=eq.${userId || a.id}&order=created_at.desc`); }
  async mention(token: string, contentId: string, mentionedUserId: string) { const a = await this.actor(token); const rows = await this.db.post<any[]>('resa_mentions', token, { content_id: contentId, mentioned_user_id: mentionedUserId, mentioned_by: a.id }); return rows[0]; }
  async topic(token: string, name: string) { const normalized = this.clean(name, 'name', 80).toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'); const rows = await this.db.upsert<any[]>('resa_topics', token, { name, normalized_name: normalized }, '?on_conflict=normalized_name'); return rows[0]; }
  async attachTopic(token: string, contentId: string, topicId: string) { const rows = await this.db.post<any[]>('resa_content_topics', token, { content_id: contentId, topic_id: topicId }); return rows[0]; }
  async save(token: string, contentId: string) { const a = await this.actor(token); const rows = await this.db.upsert<any[]>('resa_saves', token, { content_id: contentId, user_id: a.id }, '?on_conflict=content_id,user_id'); return rows[0]; }
  async unsave(token: string, contentId: string) { const a = await this.actor(token); await this.db.delete('resa_saves', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`); return { removed: true }; }
  async repost(token: string, contentId: string, quote = false, body?: string) { const a = await this.actor(token); if (quote) { const rows = await this.db.post<any[]>('resa_contents', token, { author_id: a.id, type: 'text', body: this.clean(body, 'body', 5000), visibility: 'public', language: 'pt', quoted_content_id: contentId }); return rows[0]; } const rows = await this.db.post<any[]>('resa_shares', token, { content_id: contentId, user_id: a.id, share_type: 'repost' }); return rows[0]; }
  async feedback(token: string, contentId: string, feedback: string) { const a = await this.actor(token); if (!['not_interested', 'hide_author', 'report'].includes(feedback)) throw new BadRequestException('Invalid feed feedback'); const rows = await this.db.upsert<any[]>('resa_feed_feedback', token, { user_id: a.id, content_id: contentId, feedback }, '?on_conflict=user_id,content_id'); return rows[0]; }
  async schedule(token: string, contentId: string, scheduledFor: string) { const a = await this.actor(token); const date = new Date(scheduledFor); if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw new BadRequestException('scheduled_for must be a future date'); const rows = await this.db.upsert<any[]>('resa_creator_schedules', token, { creator_id: a.id, content_id: contentId, scheduled_for: date.toISOString() }, '?on_conflict=content_id'); return rows[0]; }
  async schedules(token: string, limit = 50) { const a = await this.actor(token); const size = Math.min(Math.max(Number(limit) || 50, 1), 100); return this.db.get('resa_creator_schedules', token, `?select=*,resa_contents(*)&creator_id=eq.${a.id}&order=scheduled_for.asc&limit=${size}`); }
  async cancelSchedule(token: string, scheduleId: string) { const a = await this.actor(token); const rows = await this.db.patch<any[]>('resa_creator_schedules', token, { status: 'cancelled' }, `?id=eq.${scheduleId}&creator_id=eq.${a.id}&status=eq.scheduled`); if (!rows[0]) throw new BadRequestException('Scheduled content was not found or is no longer cancellable'); return rows[0]; }
}
