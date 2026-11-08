import { ResaSocialService } from './resa-social.service';
import { ResaRecommendationService } from './recommendation.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const FOLLOWED_ID = '22222222-2222-4222-8222-222222222222';

describe('ResaSocialService feeds', () => {
  let service: ResaSocialService;
  let getSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;
  const follows = [{ followed_id: FOLLOWED_ID }];
  const followedPosts = [
    { id: 'post-new', author_id: FOLLOWED_ID, type: 'text', visibility: 'public', created_at: '2026-11-08T11:00:00.000Z' },
    { id: 'post-own', author_id: ACTOR_ID, type: 'bible_study', visibility: 'public', created_at: '2026-11-08T10:00:00.000Z' },
  ];

  beforeEach(() => {
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: ACTOR_ID }) };
    service = new ResaSocialService(identity as never, new ResaRecommendationService());
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockImplementation(async (table: string) => {
      if (table === 'resa_follows') return follows as never;
      if (table === 'profiles') return [{ id: FOLLOWED_ID, privacy: {} }] as never;
      if (table === 'resa_contents') return followedPosts as never;
      return [] as never;
    });
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockImplementation(async (functionName: string) => {
      if (functionName === 'resa_content_engagement_counts') {
        return [
          { content_id: 'post-new', reaction_count: 5, comment_count: 2, share_count: 1 },
          { content_id: 'post-own', reaction_count: 3, comment_count: 0, share_count: 0 },
        ] as never;
      }
      return [
        { id: ACTOR_ID, display_name: 'My profile' },
        { id: FOLLOWED_ID, display_name: 'Followed profile' },
      ] as never;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('blocks a profile, persists the block and removes the viewer follow', async () => {
    const upsertSpy = jest.spyOn(SupabaseRestClient.prototype, 'upsert').mockResolvedValue([{ blocker_id: ACTOR_ID, blocked_id: FOLLOWED_ID }] as never);
    const deleteSpy = jest.spyOn(SupabaseRestClient.prototype, 'delete').mockResolvedValue([] as never);

    const result = await service.blockProfile('session-token', FOLLOWED_ID);

    expect(getSpy).toHaveBeenCalledWith('profiles', 'session-token', expect.stringContaining('id=eq.' + FOLLOWED_ID));
    expect(upsertSpy).toHaveBeenCalledWith('resa_user_blocks', 'session-token', {
      blocker_id: ACTOR_ID,
      blocked_id: FOLLOWED_ID,
    }, '?on_conflict=blocker_id,blocked_id');
    expect(deleteSpy).toHaveBeenCalledWith('resa_follows', 'session-token', expect.stringContaining('follower_id=eq.' + ACTOR_ID));
    expect(result).toEqual({ blocked: true });
  });

  it('does not allow blocking the current profile and supports unblocking', async () => {
    await expect(service.blockProfile('session-token', ACTOR_ID)).rejects.toThrow('You cannot block your own profile');
    const deleteSpy = jest.spyOn(SupabaseRestClient.prototype, 'delete').mockResolvedValue([] as never);
    const result = await service.unblockProfile('session-token', FOLLOWED_ID);
    expect(deleteSpy).toHaveBeenCalledWith(
      'resa_user_blocks',
      'session-token',
      expect.stringContaining('blocker_id=eq.' + ACTOR_ID),
    );
    expect(result).toEqual({ blocked: false });
  });

  it('hydrates whether the viewer has blocked the profile owner', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'profiles') return [{ id: FOLLOWED_ID, privacy: {} }] as never;
      if (table === 'resa_user_blocks') return [{ blocked_id: FOLLOWED_ID }] as never;
      return [] as never;
    });
    rpcSpy.mockResolvedValueOnce([{
      id: FOLLOWED_ID,
      display_name: 'Followed profile',
      private_locked: false,
    }] as never);

    const result = await service.publicProfile('session-token', FOLLOWED_ID);

    expect(result.profile.viewer_has_blocked).toBe(true);
  });

  it('hydrates story authors and keeps stories in their own 24-hour surface', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_contents') return [{
        id: 'story-1',
        author_id: FOLLOWED_ID,
        type: 'story',
        title: 'Community moment',
        body: 'A moment from today',
        created_at: '2026-11-08T11:00:00.000Z',
        media_type: null,
        media_url: null,
        visibility: 'public',
      }] as never;
      return [] as never;
    });
    rpcSpy.mockResolvedValue([{ id: FOLLOWED_ID, display_name: 'Followed profile', avatar_url: 'https://example.test/avatar.jpg' }] as never);

    const result = await service.stories('session-token', 30);

    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining('type=eq.story'),
    );
    expect(result).toMatchObject([
      { id: 'story-1', author_display_name: 'Followed profile', author_avatar_url: 'https://example.test/avatar.jpg' },
    ]);
  });

  it('lists only the authenticated author stories older than 24 hours in the archive', async () => {
    getSpy.mockImplementation(async (table: string, _token: string, query: string) => {
      if (table === 'resa_contents') return [{
        id: 'archived-story',
        author_id: ACTOR_ID,
        type: 'story',
        created_at: '2026-11-06T10:00:00.000Z',
        visibility: 'private',
      }] as never;
      return [] as never;
    });
    rpcSpy.mockResolvedValueOnce([{ id: ACTOR_ID, display_name: 'My profile', avatar_url: null }] as never);

    const result = await service.archivedStories('session-token', 40);

    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining(`author_id=eq.${ACTOR_ID}`),
    );
    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining('created_at=lt.'),
    );
    expect(result).toMatchObject([{ id: 'archived-story', author_id: ACTOR_ID, author_display_name: 'My profile' }]);
  });

  it('loads Following from followed authors instead of the global newest-post window', async () => {
    const result = await service.feed('session-token', 30, 'following');

    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining(`author_id=in.(${ACTOR_ID},${FOLLOWED_ID})`),
    );
    expect(result.items.map((item) => item.id)).toEqual(['post-new', 'post-own']);
    expect(result.items.every((item) => item.author_id === ACTOR_ID || item.author_id === FOLLOWED_ID)).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith('resa_profiles_for_ids', 'session-token', {
      p_user_ids: expect.arrayContaining([ACTOR_ID, FOLLOWED_ID]),
    });
  });

  it('paginates the feed with a stable created_at and id cursor', async () => {
    const firstId = '33333333-3333-4333-8333-333333333333';
    const secondId = '44444444-4444-4444-8444-444444444444';
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_follows') return follows as never;
      if (table === 'resa_contents') return [
        { ...followedPosts[0], id: firstId },
        { ...followedPosts[1], id: secondId },
      ] as never;
      return [] as never;
    });

    const result = await service.feed('session-token', 1, 'following');

    expect(result.items).toHaveLength(1);
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe(`2026-11-08T11:00:00.000Z|${firstId}`);
    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining('order=created_at.desc,id.desc&limit=2'),
    );

    await service.feed('session-token', 1, 'following', result.next_cursor ?? undefined);
    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining('created_at.lt.2026-11-08T11%3A00%3A00.000Z'),
    );
  });

  it('rejects malformed feed cursors before querying content', async () => {
    await expect(service.feed('session-token', 30, 'for_you', 'not-a-valid-cursor'))
      .rejects.toThrow('Invalid feed cursor');
    expect(getSpy).not.toHaveBeenCalledWith('resa_contents', 'session-token', expect.any(String));
  });

  it('uses privacy-scoped aggregate engagement metrics for ranking and display', async () => {
    const result = await service.feed('session-token', 30, 'following');

    expect(rpcSpy).toHaveBeenCalledWith('resa_content_engagement_counts', 'session-token', {
      p_content_ids: ['post-new', 'post-own'],
    });
    expect(result.items.find((item) => item.id === 'post-new')).toMatchObject({
      reaction_count: 5,
      comment_count: 2,
      share_count: 1,
      interactionCount: 8,
    });
  });

  it('queries all non-private audiences in the For You feed and relies on RLS for access', async () => {
    await service.feed('session-token', 30, 'for_you');
    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining('visibility=in.(public,followers,community,organization)'),
    );
  });

  it('persists community audience references when creating community content', async () => {
    const postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([
      { id: 'community-post' },
    ] as never);

    await service.createContent('session-token', {
      type: 'text',
      body: 'Community-only update',
      visibility: 'community',
      community_id: '66666666-6666-4666-8666-666666666666',
    });

    expect(postSpy).toHaveBeenCalledWith('resa_contents', 'session-token', expect.objectContaining({
      visibility: 'community',
      community_id: '66666666-6666-4666-8666-666666666666',
    }));
  });

  it('rejects community content without a target community', async () => {
    await expect(service.createContent('session-token', {
      type: 'text',
      body: 'Missing community target',
      visibility: 'community',
    })).rejects.toThrow('community_id is required for community-only content');
  });

  it('rejects follower-only media while the media bucket is public', async () => {
    const postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post');

    await expect(service.createContent('session-token', {
      type: 'text',
      body: 'Private media post',
      visibility: 'followers',
      media_type: 'image',
      media_url: 'https://example.test/public-image.jpg',
      media_path: ACTOR_ID + '/private-image.jpg',
    })).rejects.toThrow('Media attachments currently require public visibility');

    expect(postSpy).not.toHaveBeenCalled();
  });

  it('hydrates follower and following lists by their actual profile IDs', async () => {
    getSpy.mockImplementation(async (table: string, _token: string, query: string) => {
      if (table !== 'resa_follows') return [] as never;
      if (query.includes('followed_id=eq.' + ACTOR_ID)) {
        return [{ follower_id: FOLLOWED_ID, created_at: '2026-11-08T10:00:00.000Z' }] as never;
      }
      if (query.includes('follower_id=eq.' + ACTOR_ID)) {
        return [{ followed_id: '33333333-3333-4333-8333-333333333333', created_at: '2026-11-08T11:00:00.000Z' }] as never;
      }
      return [] as never;
    });
    rpcSpy.mockResolvedValue([
      { id: FOLLOWED_ID, display_name: 'Follower profile' },
      { id: '33333333-3333-4333-8333-333333333333', display_name: 'Following profile' },
    ] as never);

    const result = await service.social('session-token');

    expect(rpcSpy).toHaveBeenCalledWith('resa_profiles_for_ids', 'session-token', {
      p_user_ids: expect.arrayContaining([FOLLOWED_ID, '33333333-3333-4333-8333-333333333333']),
    });
    expect(rpcSpy).not.toHaveBeenCalledWith('resa_search_profiles', 'session-token', expect.anything());
    expect(result.followers[0]).toMatchObject({ id: FOLLOWED_ID, display_name: 'Follower profile' });
    expect(result.following[0]).toMatchObject({ id: '33333333-3333-4333-8333-333333333333', display_name: 'Following profile' });
  });

  it('builds profile suggestions from the social graph without an empty search query', async () => {
    const candidateId = '44444444-4444-4444-8444-444444444444';
    getSpy.mockImplementation(async (table: string, _token: string, query: string) => {
      if (table !== 'resa_follows') return [] as never;
      if (query.includes('follower_id=eq.' + ACTOR_ID)) {
        return [{ followed_id: FOLLOWED_ID }] as never;
      }
      if (query.includes('follower_id=in.(' + FOLLOWED_ID + ')')) {
        return [{ follower_id: FOLLOWED_ID, followed_id: candidateId }] as never;
      }
      return [] as never;
    });
    rpcSpy.mockResolvedValue([
      { id: candidateId, display_name: 'Suggested profile' },
    ] as never);

    const result = await service.suggestions('session-token', 10);

    expect(rpcSpy).toHaveBeenCalledWith('resa_profiles_for_ids', 'session-token', {
      p_user_ids: [candidateId],
    });
    expect(rpcSpy).not.toHaveBeenCalledWith('resa_search_profiles', 'session-token', expect.anything());
    expect(result).toMatchObject([
      { id: candidateId, display_name: 'Suggested profile', relationship: 'suggested', mutual_follow_count: 1 },
    ]);
  });

  it('creates scheduled content through the atomic publishing RPC', async () => {
    rpcSpy.mockResolvedValue([{ id: 'schedule-1', status: 'scheduled' }] as never);

    const result = await service.scheduleNew('session-token', {
      title: 'Scheduled reflection',
      body: 'A reflection prepared for later publication.',
      type: 'text',
      publish_visibility: 'public',
      language: 'pt',
      scheduled_for: '2099-01-01T10:00:00.000Z',
    });

    expect(rpcSpy).toHaveBeenCalledWith('resa_create_scheduled_content', 'session-token', {
      p_title: 'Scheduled reflection',
      p_body: 'A reflection prepared for later publication.',
      p_type: 'text',
      p_publish_visibility: 'public',
      p_language: 'pt',
      p_scheduled_for: '2099-01-01T10:00:00.000Z',
    });
    expect(result).toMatchObject({ id: 'schedule-1', status: 'scheduled' });
  });

  it('schedules existing content through the ownership-checking RPC', async () => {
    rpcSpy.mockResolvedValue([{ id: 'schedule-2', status: 'scheduled' }] as never);

    await service.schedule(
      'session-token',
      '55555555-5555-4555-8555-555555555555',
      '2099-01-01T10:00:00.000Z',
      'followers',
    );

    expect(rpcSpy).toHaveBeenCalledWith('resa_schedule_content', 'session-token', {
      p_content_id: '55555555-5555-4555-8555-555555555555',
      p_scheduled_for: '2099-01-01T10:00:00.000Z',
      p_publish_visibility: 'followers',
    });
  });

  it('makes follow creation idempotent using the database composite key', async () => {
    const upsertSpy = jest.spyOn(SupabaseRestClient.prototype, 'upsert').mockResolvedValue([
      { follower_id: ACTOR_ID, followed_id: FOLLOWED_ID },
    ] as never);

    await service.follow('session-token', FOLLOWED_ID);

    expect(upsertSpy).toHaveBeenCalledWith(
      'resa_follows',
      'session-token',
      { follower_id: ACTOR_ID, followed_id: FOLLOWED_ID },
      '?on_conflict=follower_id,followed_id',
    );
  });
});
