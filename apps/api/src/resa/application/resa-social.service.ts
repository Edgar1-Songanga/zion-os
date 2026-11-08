import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ResaRecommendationService } from './recommendation.service';

@Injectable()
export class ResaSocialService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService, private readonly recommendations: ResaRecommendationService) {}
  private async actor(token: string) { return this.identity.getCurrentUser(token); }
  private async mutedIds(token: string, userId: string): Promise<string[]> {
    const rows = await this.db.get<any[]>(
      'resa_user_mutes',
      token,
      `?select=muted_id&muter_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1000`,
    );
    return [...new Set(rows.map((row) => row.muted_id).filter(Boolean))];
  }
  private mutedAuthorFilter(ids: string[]): string {
    return ids.length ? `&author_id=not.in.(${ids.map((id) => encodeURIComponent(id)).join(',')})` : '';
  }
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

  async feed(token: string, limit = 30, mode: 'for_you' | 'following' | 'latest' = 'for_you', before?: string) {
    const a = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const mutedIds = await this.mutedIds(token, a.id);
    const mutedSet = new Set(mutedIds);
    const mutedFilter = this.mutedAuthorFilter(mutedIds);
    let cursorFilter = '';
    if (before) {
      const separator = before.indexOf('|');
      const createdAt = separator >= 0 ? before.slice(0, separator) : '';
      const contentId = separator >= 0 ? before.slice(separator + 1) : '';
      const parsedDate = Date.parse(createdAt);
      if (!Number.isFinite(parsedDate) || !/^\d{4}-\d{2}-\d{2}T/.test(createdAt)
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contentId)) {
        throw new BadRequestException('Invalid feed cursor');
      }
      cursorFilter = `&or=(created_at.lt.${encodeURIComponent(createdAt)},and(created_at.eq.${encodeURIComponent(createdAt)},id.lt.${contentId}))`;
    }

    // The Following feed must query the followed authors directly. Filtering only
    // the global newest 120 posts would silently omit followed creators whenever
    // unrelated accounts publish more frequently.
    const followingRows = mode === 'following'
      ? await this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${a.id}&order=created_at.desc&limit=1000`)
      : null;
    const followedAuthorIds = followingRows
      ? [...new Set([a.id, ...followingRows.map((row) => row.followed_id).filter((id) => Boolean(id) && !mutedSet.has(id))])]
      : [];
    const contentQuery = mode === 'following'
      ? `?select=id,author_id,type,title,body,visibility,language,created_at,media_type,media_url,organization_id,ministry_id,scripture_references,quoted_content_id,community_id&type=neq.story&visibility=in.(public,followers,community,organization)&author_id=in.(${followedAuthorIds.join(',')})&order=created_at.desc,id.desc&limit=${size + 1}${cursorFilter}`
      : `?select=id,author_id,type,title,body,visibility,language,created_at,media_type,media_url,organization_id,ministry_id,scripture_references,quoted_content_id,community_id&type=neq.story&visibility=in.(public,followers,community,organization)&order=created_at.desc,id.desc&limit=${size + 1}${cursorFilter}`;
    const fetchedContents = await this.db.get<any[]>('resa_contents', token, contentQuery);
    const hasMore = fetchedContents.length > size;
    const contents = fetchedContents.slice(0, size);
    const lastChronologicalItem = contents[contents.length - 1];
    const nextCursor = hasMore && lastChronologicalItem
      ? `${lastChronologicalItem.created_at}|${lastChronologicalItem.id}`
      : null;
    const contentIds = contents.map((item) => item.id).filter(Boolean);
    const authorIds = [...new Set(contents.map((item) => item.author_id).filter(Boolean))];

    // Scope personalized lookups to this feed page rather than downloading each user's
    // entire feedback history and saved-content list on every refresh.
    const contentFilter = contentIds.length ? `in.(${contentIds.join(',')})` : null;
    const authorFilter = authorIds.length ? `in.(${authorIds.join(',')})` : null;
    const [follows, feedback, engagements, saves, viewerReactions] = await Promise.all([
      followingRows
        ? Promise.resolve(followingRows)
        : authorFilter
          ? this.db.get<any[]>( 'resa_follows', token, `?select=followed_id&follower_id=eq.${a.id}&followed_id=${authorFilter}&limit=120`)
          : Promise.resolve([]),
      contentFilter
        ? this.db.get<any[]>( 'resa_feed_feedback', token, `?select=content_id,feedback&user_id=eq.${a.id}&content_id=${contentFilter}&limit=120`)
        : Promise.resolve([]),
      contentFilter
        ? this.db.rpc<any[]>('resa_content_engagement_counts', token, { p_content_ids: contentIds })
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
    const engagementByContent = new Map(engagements.map((row) => [row.content_id, row]));
    const saved = new Set(saves.map((row) => row.content_id));
    const reactedByViewer = new Set(viewerReactions.map((row) => row.content_id));
    const feedMode = mode;
    const eligibleContents = feedMode === 'following'
      ? contents.filter((item) => item.author_id === a.id || followed.has(item.author_id))
      : contents;
    const preparedContents = eligibleContents
      .filter((item) => !hiddenAuthors.has(item.author_id) && hidden.get(item.id) !== 'report')
      .map((item) => ({
        ...item,
        followedAuthor: followed.has(item.author_id),
        reaction_count: Number(engagementByContent.get(item.id)?.reaction_count ?? 0),
        comment_count: Number(engagementByContent.get(item.id)?.comment_count ?? 0),
        share_count: Number(engagementByContent.get(item.id)?.share_count ?? 0),
        interactionCount:
          Number(engagementByContent.get(item.id)?.reaction_count ?? 0)
          + Number(engagementByContent.get(item.id)?.comment_count ?? 0)
          + Number(engagementByContent.get(item.id)?.share_count ?? 0),
        saved: saved.has(item.id),
        viewer_saved: saved.has(item.id),
        viewer_reacted: reactedByViewer.has(item.id),
        feedback: hidden.get(item.id),
        contentType: item.type,
        ageHours: Math.max(0, (Date.now() - Date.parse(item.created_at)) / 3600000),
      }));
    const ranked = feedMode === 'for_you'
      ? this.recommendations.rank(preparedContents)
      : preparedContents.map((item) => ({ ...item, score: 0 }));
    const visibleProfiles = authorIds.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
      : [];
    const profilesById = new Map(visibleProfiles.map((profile) => [profile.id, profile]));

    // "For you" is ranked; "following" is restricted to followed profiles;
    // "latest" is global and chronological. Both chronological modes remain stable.
    const items = ranked.map((item) => {
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
      const byTime = (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      return byTime || String(b.id).localeCompare(String(a.id));
    });
    return { items, next_cursor: nextCursor, has_more: hasMore };
  }

  async reels(token: string, limit = 30) {
    const viewer = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const mutedIds = await this.mutedIds(token, viewer.id);
    const rows = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=id,author_id,title,body,created_at,media_url,media_type,language,visibility&type=neq.story&media_type=eq.video&visibility=in.(public,followers,community,organization)${this.mutedAuthorFilter(mutedIds)}&order=created_at.desc&limit=${size}`,
    );
    const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
    const contentIds = rows.map((row) => row.id).filter(Boolean);
    const [profiles, viewerReactions, engagements] = await Promise.all([
      authorIds.length
        ? this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
        : Promise.resolve([]),
      contentIds.length
        ? this.db.get<any[]>('resa_reactions', token, `?select=content_id&user_id=eq.${viewer.id}&content_id=in.(${contentIds.join(',')})&limit=50`)
        : Promise.resolve([]),
      contentIds.length
        ? this.db.rpc<any[]>('resa_content_engagement_counts', token, { p_content_ids: contentIds })
        : Promise.resolve([]),
    ]);
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    const reactedIds = new Set(viewerReactions.map((reaction) => reaction.content_id));
    const engagementByContent = new Map(engagements.map((row) => [row.content_id, row]));
    return rows.map((row) => {
      const profile = byId.get(row.author_id);
      return {
        ...row,
        viewer_reacted: reactedIds.has(row.id),
        reaction_count: Number(engagementByContent.get(row.id)?.reaction_count ?? 0),
        comment_count: Number(engagementByContent.get(row.id)?.comment_count ?? 0),
        share_count: Number(engagementByContent.get(row.id)?.share_count ?? 0),
        author_display_name: profile?.display_name?.trim()
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
          || 'Membro RESA',
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });
  }

  async explore(token: string, query?: string, limit = 30) {
    const viewer = await this.actor(token); const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const [mutedIds] = await Promise.all([this.mutedIds(token, viewer.id)]);
    const filter = query?.trim() ? `&or=(title.ilike.*${encodeURIComponent(query.trim())}*,body.ilike.*${encodeURIComponent(query.trim())}*)` : '';
    return this.db.get('resa_contents', token, `?select=*&type=neq.story&visibility=in.(public,followers,community,organization)${this.mutedAuthorFilter(mutedIds)}&order=created_at.desc&limit=${size}${filter}`);
  }
  async stories(token: string, limit = 30) {
    const viewer = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const mutedIds = await this.mutedIds(token, viewer.id);
    const rows = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=id,author_id,title,body,created_at,media_type,media_url,media_path,visibility,language&type=eq.story&visibility=in.(public,followers,community,organization)${this.mutedAuthorFilter(mutedIds)}&created_at=gte.${encodeURIComponent(new Date(Date.now() - 86400000).toISOString())}&order=created_at.desc&limit=${size}`,
    );
    const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
    const storyIds = rows.map((row) => row.id).filter(Boolean);
    const [profiles, reactions] = await Promise.all([
      authorIds.length
        ? this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: authorIds })
        : Promise.resolve([]),
      storyIds.length
        ? this.db.get<any[]>('resa_reactions', token, `?select=content_id&user_id=eq.${viewer.id}&content_id=in.(${storyIds.join(',')})&limit=${size}`)
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
  async archivedStories(token: string, limit = 60) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 60, 1), 100);
    const cutoff = new Date(Date.now() - 86400000).toISOString();
    // The archive is private to its owner. RLS also permits owners to read
    // their own content regardless of audience visibility.
    const rows = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=id,author_id,title,body,created_at,media_type,media_url,media_path,visibility,language&type=eq.story&author_id=eq.${encodeURIComponent(actor.id)}&created_at=lt.${encodeURIComponent(cutoff)}&order=created_at.desc&limit=${size}`,
    );
    const profiles = await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: [actor.id] });
    const profile = profiles[0];
    const displayName = profile?.display_name?.trim()
      || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
      || 'Membro RESA';
    return rows.map((row) => ({
      ...row,
      author_display_name: displayName,
      author_avatar_url: profile?.avatar_url ?? null,
    }));
  }

  async recordStoryView(token: string, storyId: string) {
    await this.actor(token);
    const recorded = await this.db.rpc<boolean>('resa_record_story_view', token, {
      p_story_id: storyId,
    });
    return { recorded: recorded === true };
  }

  async storyViews(token: string, storyId: string) {
    const actor = await this.actor(token);
    const stories = await this.db.get<any[]>(
      'resa_contents',
      token,
      `?select=id,author_id,type&id=eq.${encodeURIComponent(storyId)}&type=eq.story&limit=1`,
    );
    const story = stories[0];
    if (!story) throw new NotFoundException('Story not found');
    if (story.author_id !== actor.id) return { is_author: false };

    const views = await this.db.get<any[]>(
      'resa_story_views',
      token,
      `?select=viewer_id,viewed_at&story_id=eq.${encodeURIComponent(storyId)}&order=viewed_at.desc&limit=1000`,
    );
    const viewCount = await this.db.rpc<number>('resa_story_view_count', token, {
      p_story_id: storyId,
    });
    const viewerIds = [...new Set(views.map((view) => view.viewer_id).filter(Boolean))];
    const profiles: any[] = [];
    for (let offset = 0; offset < viewerIds.length; offset += 200) {
      const batch = await this.db.rpc<any[]>('resa_profiles_for_ids', token, {
        p_user_ids: viewerIds.slice(offset, offset + 200),
      });
      profiles.push(...batch);
    }
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    return {
      is_author: true,
      view_count: Number(viewCount ?? views.length),
      viewers: views.map((view) => {
        const profile = profilesById.get(view.viewer_id);
        return {
          user_id: view.viewer_id,
          viewed_at: view.viewed_at,
          display_name: profile?.display_name?.trim()
            || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
            || 'Membro RESA',
          avatar_url: profile?.avatar_url ?? null,
        };
      }),
    };
  }

  async createContent(token: string, input: any) {
    const a = await this.actor(token); const type = this.clean(input.type, 'type', 40); const visibility = input.visibility || 'public';
    if (!['public', 'followers', 'community', 'organization', 'private'].includes(visibility)) throw new BadRequestException('Invalid visibility');
    const communityId = typeof input.community_id === 'string' && input.community_id.trim() ? input.community_id.trim() : null;
    const organizationId = typeof input.organization_id === 'string' && input.organization_id.trim() ? input.organization_id.trim() : null;
    if (visibility === 'community' && !communityId) throw new BadRequestException('community_id is required for community-only content');
    if (visibility === 'organization' && !organizationId) throw new BadRequestException('organization_id is required for organization-only content');
    const mediaType = input.media_type === 'image' || input.media_type === 'video' ? input.media_type : null;
    const mediaUrl = typeof input.media_url === 'string' && input.media_url.trim() ? input.media_url.trim() : null;
    const mediaPath = typeof input.media_path === 'string' && input.media_path.trim() ? input.media_path.trim() : null;
    if (mediaType && !mediaUrl) throw new BadRequestException('media_url is required when media_type is provided');
    if (visibility !== 'public' && (mediaType || mediaUrl || mediaPath)) {
      throw new BadRequestException('Media attachments currently require public visibility. Private media delivery is being secured separately.');
    }
    const body = { author_id: a.id, type, title: typeof input.title === 'string' ? input.title.trim() || null : null, body: typeof input.body === 'string' ? input.body.trim() || null : null, visibility, language: typeof input.language === 'string' && input.language.trim() ? input.language.trim() : 'pt', organization_id: organizationId, community_id: communityId, ministry_id: input.ministry_id ?? null, scripture_references: Array.isArray(input.scripture_references) ? input.scripture_references.slice(0, 50) : [], media_type: mediaType, media_url: mediaUrl, media_path: mediaPath };
    if (!body.body && !body.title) throw new BadRequestException('title or body is required');
    const rows = await this.db.post<any[]>('resa_contents', token, body); return rows[0];
  }
  async comment(token: string, contentId: string, input: { body: string; parent_id?: string | null }) {
    const a = await this.actor(token); const rows = await this.db.post<any[]>('resa_comments', token, { content_id: contentId, author_id: a.id, body: this.clean(input.body, 'body', 5000), parent_id: input.parent_id ?? null }); return rows[0];
  }
  async comments(token: string, contentId: string, limit = 50, before?: string) {
    await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const cursor = before ? `&created_at=gt.${encodeURIComponent(before)}` : '';
    const rows = await this.db.get<any[]>('resa_comments', token, `?select=*&content_id=eq.${encodeURIComponent(contentId)}&status=eq.active&order=created_at.asc&limit=${size}${cursor}`);
    const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
    const profiles: any[] = [];
    for (let offset = 0; offset < authorIds.length; offset += 200) {
      const batch = await this.db.rpc<any[]>('resa_profiles_for_ids', token, {
        p_user_ids: authorIds.slice(offset, offset + 200),
      });
      profiles.push(...batch);
    }
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return rows.map((row) => {
      const profile = byId.get(row.author_id);
      return {
        ...row,
        author_display_name: profile?.display_name?.trim()
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
          || 'Membro RESA',
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });
  }
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
    const rows = await this.db.rpc<any[]>('resa_public_profile', token, { p_user_id: id });
    const profile = rows?.[0];
    if (!profile) throw new NotFoundException('Profile not found');
    const [blocks, mutes] = actor.id === id ? [[], []] : await Promise.all([
      this.db.get<any[]>('resa_user_blocks', token, `?select=blocked_id&blocker_id=eq.${actor.id}&blocked_id=eq.${id}&limit=1`),
      this.db.get<any[]>('resa_user_mutes', token, `?select=muted_id&muter_id=eq.${actor.id}&muted_id=eq.${id}&limit=1`),
    ]);
    profile.viewer_has_blocked = blocks.length > 0;
    profile.viewer_has_muted = mutes.length > 0;
    const contents = profile.private_locked ? [] : await this.db.get<any[]>('resa_contents', token, `?select=id,author_id,type,title,body,created_at,media_type,media_url,language&type=neq.story&author_id=eq.${encodeURIComponent(id)}&visibility=in.(public,followers,community,organization)&order=created_at.desc&limit=20`);
    return { profile, contents };
  }

  async blockProfile(token: string, userId: string) {
    const actor = await this.actor(token);
    const id = this.clean(userId, 'user_id', 80);
    if (actor.id === id) throw new BadRequestException('You cannot block your own profile');
    const target = await this.db.get<any[]>('profiles', token, `?select=id&id=eq.${id}&limit=1`);
    if (!target[0]) throw new NotFoundException('Profile not found');
    await this.db.upsert('resa_user_blocks', token, {
      blocker_id: actor.id,
      blocked_id: id,
    }, '?on_conflict=blocker_id,blocked_id');
    await this.db.delete('resa_follows', token, `?follower_id=eq.${actor.id}&followed_id=eq.${id}`);
    return { blocked: true };
  }

  async unblockProfile(token: string, userId: string) {
    const actor = await this.actor(token);
    const id = this.clean(userId, 'user_id', 80);
    await this.db.delete('resa_user_blocks', token, `?blocker_id=eq.${actor.id}&blocked_id=eq.${id}`);
    return { blocked: false };
  }

  async blockedProfiles(token: string) {
    const actor = await this.actor(token);
    const blocks = await this.db.get<any[]>(
      'resa_user_blocks',
      token,
      `?select=blocked_id,created_at&blocker_id=eq.${actor.id}&order=created_at.desc&limit=500`,
    );
    const ids = [...new Set(blocks.map((row) => row.blocked_id).filter(Boolean))];
    if (!ids.length) return [];
    const profiles: any[] = [];
    for (let offset = 0; offset < ids.length; offset += 200) {
      const batch = await this.db.rpc<any[]>('resa_profiles_for_ids', token, {
        p_user_ids: ids.slice(offset, offset + 200),
      });
      profiles.push(...batch);
    }
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return blocks.map((block) => ({
      user_id: block.blocked_id,
      blocked_at: block.created_at,
      profile: byId.get(block.blocked_id) ?? null,
    }));
  }

  async muteProfile(token: string, userId: string) {
    const actor = await this.actor(token);
    const id = this.clean(userId, 'user_id', 80);
    if (actor.id === id) throw new BadRequestException('You cannot mute your own profile');
    const target = await this.db.get<any[]>('profiles', token, `?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!target[0]) throw new NotFoundException('Profile not found');
    await this.db.upsert('resa_user_mutes', token, {
      muter_id: actor.id,
      muted_id: id,
    }, '?on_conflict=muter_id,muted_id');
    return { muted: true };
  }

  async unmuteProfile(token: string, userId: string) {
    const actor = await this.actor(token);
    const id = this.clean(userId, 'user_id', 80);
    await this.db.delete('resa_user_mutes', token, `?muter_id=eq.${actor.id}&muted_id=eq.${encodeURIComponent(id)}`);
    return { muted: false };
  }

  async mutedProfiles(token: string) {
    const actor = await this.actor(token);
    const mutes = await this.db.get<any[]>(
      'resa_user_mutes',
      token,
      `?select=muted_id,created_at&muter_id=eq.${actor.id}&order=created_at.desc&limit=1000`,
    );
    const ids = [...new Set(mutes.map((row) => row.muted_id).filter(Boolean))];
    const profiles: any[] = [];
    for (let offset = 0; offset < ids.length; offset += 200) {
      const batch = await this.db.rpc<any[]>('resa_profiles_for_ids', token, {
        p_user_ids: ids.slice(offset, offset + 200),
      });
      profiles.push(...batch);
    }
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return mutes.map((mute) => ({
      user_id: mute.muted_id,
      muted_at: mute.created_at,
      profile: byId.get(mute.muted_id) ?? null,
    }));
  }

  async social(token: string, userId?: string) {
    const actor = await this.actor(token);
    const targetId = userId || actor.id;
    const [followers, following, actorFollowingTarget] = await Promise.all([
      this.db.get<any[]>('resa_follows', token, `?select=follower_id,created_at&followed_id=eq.${targetId}&order=created_at.desc&limit=100`),
      this.db.get<any[]>('resa_follows', token, `?select=followed_id,created_at&follower_id=eq.${targetId}&order=created_at.desc&limit=100`),
      targetId === actor.id ? Promise.resolve([]) : this.db.get<any[]>('resa_follows', token, `?select=followed_id&follower_id=eq.${actor.id}&followed_id=eq.${targetId}&limit=1`),
    ]);
    const profileIds = [...new Set([
      ...followers.map((row) => row.follower_id),
      ...following.map((row) => row.followed_id),
    ].filter(Boolean))];
    // Resolve only the identities present in these lists. Search requires a real
    // query string and must not be used as an empty-query profile directory.
    const profiles = profileIds.length
      ? await this.db.rpc<any[]>('resa_profiles_for_ids', token, { p_user_ids: profileIds })
      : [];
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
    const following = await this.db.get<any[]>(
      'resa_follows',
      token,
      `?select=followed_id&follower_id=eq.${actor.id}&order=created_at.desc&limit=1000`,
    );
    const followedIds = [...new Set(following.map((row) => row.followed_id).filter(Boolean))];
    if (!followedIds.length) return [];

    // Discover candidates through the viewer's existing social graph. Never use
    // the profile-search RPC with an empty query as an unbounded directory.
    const secondDegree = await this.db.get<any[]>(
      'resa_follows',
      token,
      `?select=follower_id,followed_id&follower_id=in.(${followedIds.join(',')})&limit=2000`,
    );
    const mutualCounts = new Map<string, number>();
    for (const row of secondDegree) {
      const candidateId = row.followed_id;
      if (!candidateId || candidateId === actor.id || followedIds.includes(candidateId)) continue;
      mutualCounts.set(candidateId, (mutualCounts.get(candidateId) ?? 0) + 1);
    }
    const candidateIds = [...mutualCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([id]) => id);
    if (!candidateIds.length) return [];

    // This RPC is the privacy boundary: it returns only profiles the viewer is
    // allowed to discover under the current four-level visibility policy.
    const profiles = await this.db.rpc<any[]>(
      'resa_profiles_for_ids',
      token,
      { p_user_ids: candidateIds },
    );
    return profiles
      .map((profile) => ({
        ...profile,
        relationship: 'suggested',
        mutual_follow_count: mutualCounts.get(profile.id) ?? 0,
      }))
      .sort((a, b) => b.mutual_follow_count - a.mutual_follow_count)
      .slice(0, size);
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
  async schedule(token: string, contentId: string, scheduledFor: string, publishVisibility?: string) {
    await this.actor(token);
    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException('scheduled_for must be a future date');
    }
    const rows = await this.db.rpc<any[]>('resa_schedule_content', token, {
      p_content_id: contentId,
      p_scheduled_for: date.toISOString(),
      p_publish_visibility: publishVisibility ?? null,
    });
    return rows[0];
  }
  async scheduleNew(token: string, input: {
    title?: string; body?: string; type?: string; publish_visibility?: string;
    language?: string; scheduled_for: string;
  }) {
    await this.actor(token);
    const date = new Date(input.scheduled_for);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException('scheduled_for must be a future date');
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!title && !body) throw new BadRequestException('title or body is required');
    const visibility = input.publish_visibility || 'public';
    if (!['public', 'followers'].includes(visibility)) {
      throw new BadRequestException('New scheduled posts can currently target public or followers audiences.');
    }
    const rows = await this.db.rpc<any[]>('resa_create_scheduled_content', token, {
      p_title: title || null,
      p_body: body || null,
      p_type: input.type || 'text',
      p_publish_visibility: visibility,
      p_language: input.language || 'pt',
      p_scheduled_for: date.toISOString(),
    });
    return rows[0];
  }
  async schedules(token: string, limit = 50) { const a = await this.actor(token); const size = Math.min(Math.max(Number(limit) || 50, 1), 100); return this.db.get('resa_creator_schedules', token, `?select=*,resa_contents(*)&creator_id=eq.${a.id}&order=scheduled_for.asc&limit=${size}`); }
  async cancelSchedule(token: string, scheduleId: string) { const a = await this.actor(token); const rows = await this.db.patch<any[]>('resa_creator_schedules', token, { status: 'cancelled' }, `?id=eq.${scheduleId}&creator_id=eq.${a.id}&status=eq.scheduled`); if (!rows[0]) throw new BadRequestException('Scheduled content was not found or is no longer cancellable'); return rows[0]; }
}
