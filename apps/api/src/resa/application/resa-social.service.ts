import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class ResaSocialService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) {
    return this.identity.getCurrentUser(token);
  }

  private clean(value: unknown, field: string, max = 10000) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required`);
    const v = value.trim();
    if (v.length > max) throw new BadRequestException(`${field} is too long`);
    return v;
  }

  async listContent(token: string, limit = 30, before?: string) {
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filter = before ? `&created_at=lt.${encodeURIComponent(before)}` : '';
    return this.db.get('resa_contents', token,
      `?select=*&order=created_at.desc&limit=${size}${filter}`);
  }

  async createContent(token: string, input: any) {
    const a = await this.actor(token);
    const type = this.clean(input.type, 'type', 40);
    const visibility = input.visibility || 'public';
    const allowed = ['public','followers','community','organization','private'];
    if (!allowed.includes(visibility)) throw new BadRequestException('Invalid visibility');
    const body = {
      author_id: a.id,
      type,
      title: typeof input.title === 'string' ? input.title.trim() || null : null,
      body: typeof input.body === 'string' ? input.body.trim() || null : null,
      visibility,
      language: typeof input.language === 'string' && input.language.trim() ? input.language.trim() : 'pt',
      organization_id: input.organization_id ?? null,
      ministry_id: input.ministry_id ?? null,
      scripture_references: Array.isArray(input.scripture_references) ? input.scripture_references.slice(0, 50) : [],
    };
    if (!body.body && !body.title) throw new BadRequestException('title or body is required');
    const rows = await this.db.post<any[]>('resa_contents', token, body);
    return rows[0];
  }

  async comment(token: string, contentId: string, input: { body: string; parent_id?: string | null }) {
    const a = await this.actor(token);
    const body = this.clean(input.body, 'body', 5000);
    const rows = await this.db.post<any[]>('resa_comments', token, {
      content_id: contentId, author_id: a.id, body, parent_id: input.parent_id ?? null,
    });
    return rows[0];
  }

  async comments(token: string, contentId: string) {
    return this.db.get('resa_comments', token,
      `?select=*&content_id=eq.${contentId}&status=eq.active&order=created_at.asc`);
  }

  async react(token: string, contentId: string, reactionType: string) {
    const a = await this.actor(token);
    const type = this.clean(reactionType, 'reaction_type', 40).toLowerCase();
    const rows = await this.db.upsert<any[]>('resa_reactions', token, {
      content_id: contentId, user_id: a.id, reaction_type: type,
    }, '?on_conflict=content_id,user_id');
    return rows[0];
  }

  async removeReaction(token: string, contentId: string) {
    const a = await this.actor(token);
    await this.db.delete('resa_reactions', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`);
    return { removed: true };
  }

  async follow(token: string, followedId: string) {
    const a = await this.actor(token);
    if (a.id === followedId) throw new BadRequestException('You cannot follow yourself');
    const rows = await this.db.post<any[]>('resa_follows', token, { follower_id: a.id, followed_id: followedId });
    return rows[0];
  }

  async unfollow(token: string, followedId: string) {
    const a = await this.actor(token);
    await this.db.delete('resa_follows', token, `?follower_id=eq.${a.id}&followed_id=eq.${followedId}`);
    return { removed: true };
  }

  async follows(token: string, userId?: string) {
    const a = await this.actor(token);
    const id = userId || a.id;
    return this.db.get('resa_follows', token, `?select=*&follower_id=eq.${id}&order=created_at.desc`);
  }

  async mention(token: string, contentId: string, mentionedUserId: string) {
    const a = await this.actor(token);
    const rows = await this.db.post<any[]>('resa_mentions', token, {
      content_id: contentId, mentioned_user_id: mentionedUserId, mentioned_by: a.id,
    });
    await this.db.post('notifications', token, {
      user_id: mentionedUserId,
      type: 'resa.mention',
      title: 'Você foi mencionado',
      body: 'Você foi mencionado em uma publicação do RESA.',
      channel: 'in_app',
      priority: 'normal',
      data: { content_id: contentId, actor_id: a.id },
    });
    return rows[0];
  }

  async topic(token: string, name: string) {
    const normalized = this.clean(name, 'name', 80).toLowerCase().replace(/^#/, '').replace(/\\s+/g, '-');
    const rows = await this.db.upsert<any[]>('resa_topics', token, { name, normalized_name: normalized }, '?on_conflict=normalized_name');
    return rows[0];
  }

  async attachTopic(token: string, contentId: string, topicId: string) {
    const rows = await this.db.post<any[]>('resa_content_topics', token, { content_id: contentId, topic_id: topicId });
    return rows[0];
  }

  async save(token: string, contentId: string) {
    const a = await this.actor(token);
    const rows = await this.db.post<any[]>('resa_saves', token, { content_id: contentId, user_id: a.id });
    return rows[0];
  }

  async unsave(token: string, contentId: string) {
    const a = await this.actor(token);
    await this.db.delete('resa_saves', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`);
    return { removed: true };
  }

  async repost(token: string, contentId: string, quote = false, body?: string) {
    const a = await this.actor(token);
    if (quote) {
      const text = this.clean(body, 'body', 5000);
      const rows = await this.db.post<any[]>('resa_contents', token, {
        author_id: a.id, type: 'text', body: text, visibility: 'public',
        language: 'pt', quoted_content_id: contentId,
      });
      return rows[0];
    }
    const rows = await this.db.post<any[]>('resa_shares', token, {
      content_id: contentId, user_id: a.id, share_type: 'repost',
    });
    return rows[0];
  }
}
