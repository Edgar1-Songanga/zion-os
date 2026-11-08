import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
  async getContentById(token: string, contentId: string) {
    await this.actor(token);
    const rows = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=*&id=eq.${encodeURIComponent(contentId)}&limit=1`,
    );
    if (!rows[0]) throw new NotFoundException('RESA publication not found');
    return rows[0];
  }

  async feed(token: string, limit = 30, mode: 'for_you' | 'following' = 'for_you') {
    const a = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);

    // The Following feed must query the followed authors directly. Filtering only
    // the global newest 120 posts would silently omit followed creators whenever
    // unrelated accounts publish more frequently.
    const followingRows = mode === 'following'
      ? await this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${a.id}&order=created_at.desc&limit=1000`)
      : null;
    const followedAuthorIds = followingRows
      ? [...new Set([a.id, ...followingRows.map((row) => row.followed_id).filter(Boolean)])]
      : [];
    const contentQuery = mode === 'following'
      ? `?select=id,author_id,type,title,body,visibility,language,created_at,media_type,media_url,organization_id,ministry_id,scripture_references,quoted_content_id,community_id&visibility=eq.public&author_id=in.(${followedAuthorIds.join(',')})&order=created_at.desc&limit=120`
      : '?select=id,author_id,type,title,body,visibility,language,created_at,media_type,media_url,organization_id,ministry_id,scripture_references,quoted_content_id,community_id&visibility=eq.public&order=created_at.desc&limit=120';
    const contents = await this.db.get<any[]>('resa_contents', token, contentQuery);
    const contentIds = contents.map((item) => item.id).filter(Boolean);
    const authorIds = [...new Set(contents.map((item) => item.author_id).filter(Boolean))];

    // Scope personalized lookups to this feed page rather than downloading each user's
    // entire feedback history and saved-content list on every refresh.
    const contentFilter = contentIds.length ? `in.(${contentIds.join(',')})` : null;
    const authorFilter = authorIds.length ? `in.(${authorIds.join(',')})` : null;
    const [follows, feedback, reactions, saves, viewerReactions] = await Promise.all([
      followingRows
        ? Promise.resolve(followingRows)
        : authorFilter
          ? this.db.get<any[]>( 'resa_follows', token, `?select=followed_id&follower_id=eq.${a.id}&followed_id=${authorFilter}&limit=120`)
          : Promise.resolve([]),
      contentFilter
        ? this.db.get<any[]>( 'resa_feed_feedback', token, `?select=content_id,feedback&user_id=eq.${a.id}&content_id=${contentFilter}&limit=120`)
        : Promise.resolve([]),
      contentFilter
        ? this.db.get<any[]>( 'resa_reactions', token, `?select=content_id&content_id=${contentFilter}&limit=1000`)
        : Promise.resolve([]),
      contentFilter
        ? this.db.get<any[]>( 'resa_saves', token, `?select=content_id&user_id=eq.${a.id}&content_id=${contentFilter}&limit=120`)
        : Promise.resolve([]),
      contentFilter
        ? this.db.get<any[]>( 'resa_reactions', token, `?select=content_id&user_id=eq.${a.id}&content_id=${contentFilter}&limit=120`)
        : Promise.resolve([]),
    ]);

    const followed = new Set(follows.map((row) => row.followed_id));
    const hidden = new Map(feedback.map((row) => [row.content_id, row.feedback]));
    const hiddenAuthors = new Set(
      contents
        .filter((item) => hidden.get(item.id) === 'hide_author')
        .map((item) => item.author_id),
    );
    const reactionCounts = reactions.reduce<Record<string, number>>((counts, row) => {
      counts[row.content_id] = (counts[row.content_id] ?? 0) + 1;
      return counts;
    }, {});
    const saved = new Set(saves.map((row) => row.content_id));
    const reactedByViewer = new Set(viewerReactions.map((row) => row.content_id));
    const feedMode = mode === 'following' ? 'following' : 'for_you';
    const eligibleContents = feedMode === 'following'
      ? contents.filter((item) => item.author_id === a.id || followed.has(item.author_id))
      : contents;
    const ranked = this.recommendations.rank(eligibleContents
      .filter((item) => !hiddenAuthors.has(item.author_id))
      .map((item) => ({
        ...item,
        followedAuthor: followed.has(item.author_id),
        interactionCount: reactionCounts[item.id] ?? 0,
        saved: saved.has(item.id),
        viewer_saved: saved.has(item.id),
        viewer_reacted: reactedByViewer.has(item.id),
        feedback: hidden.get(item.id),
        contentType: item.type,
        ageHours: Math.max(0, (Date.now() - Date.parse(item.created_at)) / 3600000),
      })));
    const visibleProfiles = authorIds.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
      : [];
    const profilesById = new Map(visibleProfiles.map((profile) => [profile.id, profile]));

    // "For you" uses the recommendation score; "following" stays chronological
    // and is restricted to the viewer plus profiles they explicitly follow.
    return ranked.map((item) => {
      const profile = profilesById.get(item.author_id);
      const displayName = profile?.display_name?.trim()
        || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
        || 'Membro RESA';
      return {
        ...item,
        author_display_name: displayName,
        author_avatar_url: profile?.avatar_url ?? null,
      };
    }).sort((a, b) => {
      if (feedMode === 'for_you') return b.score - a.score;
      const aTime = Date.parse(a.created_at);
      const bTime = Date.parse(b.created_at);
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    }).slice(0, size);
  }

  async reels(token: string, limit = 30) {
    const viewer = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const rows = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=id,author_id,title,body,created_at,media_url,media_type,language,visibility&media_type=eq.video&visibility=eq.public&order=created_at.desc&limit=${size}`,
    );
    const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
    const contentIds = rows.map((row) => row.id).filter(Boolean);
    const [profiles, reactions] = await Promise.all([
      authorIds.length
        ? this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
        : Promise.resolve([]),
      contentIds.length
        ? this.db.get<any[]>('resa_reactions', token, `?select=content_id&user_id=eq.${viewer.id}&content_id=in.(${contentIds.join(',')})&limit=50`)
        : Promise.resolve([]),
    ]);
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    const reactedIds = new Set(reactions.map((reaction) => reaction.content_id));
    return rows.map((row) => {
      const profile = byId.get(row.author_id);
      return {
        ...row,
        viewer_reacted: reactedIds.has(row.id),
        author_display_name: profile?.display_name?.trim()
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
          || 'Membro RESA',
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });
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
    const mediaType = input.media_type === 'image' || input.media_type === 'video' ? input.media_type : null;
    const mediaUrl = typeof input.media_url === 'string' && input.media_url.trim() ? input.media_url.trim() : null;
    const mediaPath = typeof input.media_path === 'string' && input.media_path.trim() ? input.media_path.trim() : null;
    if (mediaType && !mediaUrl) throw new BadRequestException('media_url is required when media_type is provided');
    const body = { author_id: a.id, type, title: typeof input.title === 'string' ? input.title.trim() || null : null, body: typeof input.body === 'string' ? input.body.trim() || null : null, visibility, language: typeof input.language === 'string' && input.language.trim() ? input.language.trim() : 'pt', organization_id: input.organization_id ?? null, ministry_id: input.ministry_id ?? null, scripture_references: Array.isArray(input.scripture_references) ? input.scripture_references.slice(0, 50) : [], media_type: mediaType, media_url: mediaUrl, media_path: mediaPath };
    if (!body.body && !body.title) throw new BadRequestException('title or body is required');
    const rows = await this.db.post<any[]>('resa_contents', token, body); return rows[0];
  }
  async comment(token: string, contentId: string, input: { body: string; parent_id?: string | null }) {
    const a = await this.actor(token); const rows = await this.db.post<any[]>('resa_comments', token, { content_id: contentId, author_id: a.id, body: this.clean(input.body, 'body', 5000), parent_id: input.parent_id ?? null }); return rows[0];
  }
  async comments(token: string, contentId: string, limit = 50, before?: string) { await this.actor(token); const size = Math.min(Math.max(Number(limit) || 50, 1), 100); const cursor = before ? `&created_at=gt.${encodeURIComponent(before)}` : ''; return this.db.get('resa_comments', token, `?select=*&content_id=eq.${contentId}&status=eq.active&order=created_at.asc&limit=${size}${cursor}`); }
  async react(token: string, contentId: string, reactionType: string) { const a = await this.actor(token); const rows = await this.db.upsert<any[]>('resa_reactions', token, { content_id: contentId, user_id: a.id, reaction_type: this.clean(reactionType, 'reaction_type', 40).toLowerCase() }, '?on_conflict=content_id,user_id'); return rows[0]; }
  async removeReaction(token: string, contentId: string) { const a = await this.actor(token); await this.db.delete('resa_reactions', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`); return { removed: true }; }
  async follow(token: string, followedId: string) {
    const actor = await this.actor(token);
    if (actor.id === followedId) throw new BadRequestException('You cannot follow yourself');
    const targets = await this.db.get<any[]>('profiles', token, `?select=id,privacy&id=eq.${encodeURIComponent(followedId)}&limit=1`);
    if (!targets[0]) throw new NotFoundException('Profile not found');
    if (targets[0].privacy?.follow_policy === 'none') throw new ForbiddenException('Este perfil não aceita novos seguidores.');
    const rows = await this.db.upsert<any[]>('resa_follows', token, { follower_id: actor.id, followed_id: followedId }, '?on_conflict=follower_id,followed_id');
    return rows[0];
  }
  async unfollow(token: string, followedId: string) { const a = await this.actor(token); await this.db.delete('resa_follows', token, `?follower_id=eq.${a.id}&followed_id=eq.${followedId}`); return { removed: true }; }
  async publicProfile(token: string, userId: string) {
    const actor = await this.actor(token);
    const id = this.clean(userId, 'user_id', 80);
    const rows = await this.db.get<any[]>('profiles', token, `?select=id,display_name,first_name,last_name,avatar_url,bio,country_code,locale,timezone,privacy&id=eq.${encodeURIComponent(id)}&limit=1`);
    const profile = rows[0];
    if (!profile) throw new NotFoundException('Profile not found');
    const [viewerFollows, ownerFollows] = await Promise.all([
      this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${actor.id}&followed_id=eq.${id}&limit=1`),
      this.db.get<any[]>('resa_follows', token, `?select=follower_id&follower_id=eq.${id}&followed_id=eq.${actor.id}&limit=1`),
    ]);
    const isOwner = actor.id === id;
    const isFollowing = viewerFollows.length > 0;
    const isFollower = ownerFollows.length > 0;
    const privacy = profile.privacy ?? {};
    if (privacy.profile_visibility === 'private' && !isOwner && !isFollowing) throw new NotFoundException('Profile not found');
    const contents = await this.db.get<any[]>('resa_contents', token, `?select=id,author_id,type,title,body,created_at,media_type,media_url,language&author_id=eq.${encodeURIComponent(id)}&visibility=eq.public&order=created_at.desc&limit=20`);
    return {
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        first_name: privacy.profile_visibility === 'private' && !isOwner && !isFollower ? null : profile.first_name,
        last_name: privacy.profile_visibility === 'private' && !isOwner && !isFollower ? null : profile.last_name,
        avatar_url: profile.avatar_url,
        bio: isOwner || privacy.bio_visibility === 'public' || privacy.bio_visibility === 'community' ? profile.bio : null,
        country_code: isOwner || privacy.country_visibility === 'public' || privacy.country_visibility === 'community' ? profile.country_code : null,
        is_owner: isOwner,
        is_following: isFollowing,
        message_allowed: isOwner ? false : ['everyone','followers','following'].includes(privacy.message_policy ?? 'everyone') && (privacy.message_policy !== 'followers' || isFollowing) && (privacy.message_policy !== 'following' || isFollower),
        call_allowed: isOwner ? false : ['everyone','followers','following'].includes(privacy.call_policy ?? 'everyone') && (privacy.call_policy !== 'followers' || isFollowing) && (privacy.call_policy !== 'following' || isFollower),
        group_invite_allowed: isOwner ? false : ['everyone','followers','following'].includes(privacy.group_invite_policy ?? 'everyone') && (privacy.group_invite_policy !== 'followers' || isFollowing) && (privacy.group_invite_policy !== 'following' || isFollower),
        follow_allowed: !isOwner && privacy.follow_policy !== 'none',
      },
      contents,
    };
  }

  async social(token: string, userId?: string) {
    const actor = await this.actor(token);
    const targetId = userId || actor.id;
    const [followers, following, actorFollowingTarget, profiles] = await Promise.all([
      this.db.get<any[]>('resa_follows', token, `?select=follower_id,created_at&followed_id=eq.${targetId}&order=created_at.desc&limit=100`),
      this.db.get<any[]>('resa_follows', token, `?select=followed_id,created_at&follower_id=eq.${targetId}&order=created_at.desc&limit=100`),
      targetId === actor.id ? Promise.resolve([]) : this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${actor.id}&followed_id=eq.${targetId}&limit=1`),
      this.db.rpc<any[]>('resa_search_profiles', token, { p_query: '', p_limit: 50 }),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const person = (id: string, createdAt: string) => ({ id, created_at: createdAt, ...(profileMap.get(id) || {}) });
    return {
      user_id: targetId,
      is_following: targetId !== actor.id && actorFollowingTarget.length > 0,
      followers_count: followers.length,
      following_count: following.length,
      followers: followers.map((row) => person(row.follower_id, row.created_at)),
      following: following.map((row) => person(row.followed_id, row.created_at)),
    };
  }
  async suggestions(token: string, limit = 12) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 12, 1), 30);
    const [profiles, following] = await Promise.all([
      this.db.rpc<any[]>('resa_search_profiles', token, { p_query: '', p_limit: Math.min(size + 10, 50) }),
      this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${actor.id}`),
    ]);
    const followed = new Set(following.map((row) => row.followed_id));
    return profiles.filter((profile) => profile.id !== actor.id && !followed.has(profile.id)).slice(0, size).map((profile) => ({ ...profile, relationship: 'suggested' }));
  }
  async follows(token: string, userId?: string) { const a = await this.actor(token); return this.db.get('resa_follows', token, `?select=*&follower_id=eq.${userId || a.id}&order=created_at.desc`); }
  async mention(token: string, contentId: string, mentionedUserId: string) { const a = await this.actor(token); const rows = await this.db.post<any[]>('resa_mentions', token, { content_id: contentId, mentioned_user_id: mentionedUserId, mentioned_by: a.id }); return rows[0]; }
  async topic(token: string, name: string) {
    await this.actor(token);
    const cleaned = this.clean(name, 'name', 80).replace(/^#/, '').trim();
    if (!/^[\p{L}\p{N}_-]+$/u.test(cleaned)) throw new BadRequestException('Topic contains unsupported characters');
    const normalized = cleaned.toLowerCase().replace(/-+/g, '-');
    const rows = await this.db.upsert<any[]>('resa_topics', token, { name: cleaned, normalized_name: normalized }, '?on_conflict=normalized_name');
    return rows[0];
  }
  async topicFeed(token: string, slug: string, limit = 50) {
    await this.actor(token);
    const normalized = this.clean(slug, 'slug', 80).replace(/^#/, '').toLowerCase();
    const topics = await this.db.get<any[]>('resa_topics', token, `?select=id,name,normalized_name&normalized_name=eq.${encodeURIComponent(normalized)}&limit=1`);
    if (!topics[0]) return { topic: null, contents: [] };
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const links = await this.db.get<any[]>('resa_content_topics', token, `?select=content_id&topic_id=eq.${topics[0].id}&limit=1000`);
    const ids = [...new Set(links.map((row) => row.content_id).filter(Boolean))];
    if (!ids.length) return { topic: topics[0], contents: [] };
    const contents = await this.db.get<any[]>('resa_contents', token, `?select=id,author_id,type,title,body,created_at,media_type,media_url,language&visibility=eq.public&id=in.(${ids.join(',')})&order=created_at.desc&limit=${size}`);
    const authorIds = [...new Set(contents.map((item) => item.author_id).filter(Boolean))];
    const profiles = authorIds.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
      : [];
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const enriched = contents.map((item) => {
      const profile = profileMap.get(item.author_id);
      return {
        ...item,
        author_display_name: profile?.display_name?.trim()
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
          || 'Membro RESA',
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });
    return { topic: topics[0], contents: enriched };
  }
  async attachTopic(token: string, contentId: string, topicId: string) {
    const actor = await this.actor(token);
    const owned = await this.db.get<any[]>('resa_contents', token, `?select=id&id=eq.${encodeURIComponent(contentId)}&author_id=eq.${actor.id}&limit=1`);
    if (!owned[0]) throw new NotFoundException('Publication not found or not owned by this member');
    const rows = await this.db.upsert<any[]>('resa_content_topics', token, { content_id: contentId, topic_id: topicId }, '?on_conflict=content_id,topic_id');
    return rows[0];
  }
  async save(token: string, contentId: string) { const a = await this.actor(token); const rows = await this.db.upsert<any[]>('resa_saves', token, { content_id: contentId, user_id: a.id }, '?on_conflict=content_id,user_id'); return rows[0]; }
  async unsave(token: string, contentId: string) { const a = await this.actor(token); await this.db.delete('resa_saves', token, `?content_id=eq.${contentId}&user_id=eq.${a.id}`); return { removed: true }; }
  async repost(token: string, contentId: string, quote = false, body?: string) { const a = await this.actor(token); if (quote) { const rows = await this.db.post<any[]>('resa_contents', token, { author_id: a.id, type: 'text', body: this.clean(body, 'body', 5000), visibility: 'public', language: 'pt', quoted_content_id: contentId }); return rows[0]; } const rows = await this.db.post<any[]>('resa_shares', token, { content_id: contentId, user_id: a.id, share_type: 'repost' }); return rows[0]; }
  async feedback(token: string, contentId: string, feedback: string) { const a = await this.actor(token); if (!['not_interested', 'hide_author', 'report'].includes(feedback)) throw new BadRequestException('Invalid feed feedback'); const rows = await this.db.upsert<any[]>('resa_feed_feedback', token, { user_id: a.id, content_id: contentId, feedback }, '?on_conflict=user_id,content_id'); return rows[0]; }
  async schedule(token: string, contentId: string, scheduledFor: string) { const a = await this.actor(token); const date = new Date(scheduledFor); if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw new BadRequestException('scheduled_for must be a future date'); const rows = await this.db.upsert<any[]>('resa_creator_schedules', token, { creator_id: a.id, content_id: contentId, scheduled_for: date.toISOString() }, '?on_conflict=content_id'); return rows[0]; }
  async schedules(token: string, limit = 50) { const a = await this.actor(token); const size = Math.min(Math.max(Number(limit) || 50, 1), 100); return this.db.get('resa_creator_schedules', token, `?select=*,resa_contents(*)&creator_id=eq.${a.id}&order=scheduled_for.asc&limit=${size}`); }
  async cancelSchedule(token: string, scheduleId: string) { const a = await this.actor(token); const rows = await this.db.patch<any[]>('resa_creator_schedules', token, { status: 'cancelled' }, `?id=eq.${scheduleId}&creator_id=eq.${a.id}&status=eq.scheduled`); if (!rows[0]) throw new BadRequestException('Scheduled content was not found or is no longer cancellable'); return rows[0]; }
}
