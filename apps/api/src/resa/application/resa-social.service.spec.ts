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
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([
      { id: ACTOR_ID, display_name: 'My profile' },
      { id: FOLLOWED_ID, display_name: 'Followed profile' },
    ] as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads Following from followed authors instead of the global newest-post window', async () => {
    const result = await service.feed('session-token', 30, 'following');

    expect(getSpy).toHaveBeenCalledWith(
      'resa_contents',
      'session-token',
      expect.stringContaining(`author_id=in.(${ACTOR_ID},${FOLLOWED_ID})`),
    );
    expect(result.map((item) => item.id)).toEqual(['post-new', 'post-own']);
    expect(result.every((item) => item.author_id === ACTOR_ID || item.author_id === FOLLOWED_ID)).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith('resa_profiles_for_ids', 'session-token', {
      p_user_ids: expect.arrayContaining([ACTOR_ID, FOLLOWED_ID]),
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
