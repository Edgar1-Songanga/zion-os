import { NotificationService } from './notification.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

const VIEWER_ID = '11111111-1111-4111-8111-111111111111';
const MUTED_ID = '22222222-2222-4222-8222-222222222222';

describe('NotificationService account muting', () => {
  let service: NotificationService;
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: VIEWER_ID }) };
    service = new NotificationService(identity as never);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get');
  });

  afterEach(() => jest.restoreAllMocks());

  it('filters existing notifications from muted actors', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_user_mutes') return [{ muted_id: MUTED_ID }] as never;
      if (table === 'notifications') return [
        { id: 'hidden', data: { actor_id: MUTED_ID }, created_at: '2026-11-08T12:00:00Z' },
        { id: 'visible', data: { actor_id: '33333333-3333-4333-8333-333333333333' }, created_at: '2026-11-08T11:00:00Z' },
        { id: 'system', data: {}, created_at: '2026-11-08T10:00:00Z' },
      ] as never;
      return [] as never;
    });

    const result = await service.list('session-token', false, 50);

    expect(result.map((notification) => notification.id)).toEqual(['visible', 'system']);
  });

  it('does not filter notifications when the viewer has no muted accounts', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_user_mutes') return [] as never;
      if (table === 'notifications') return [{ id: 'one' }, { id: 'two' }] as never;
      return [] as never;
    });

    const result = await service.list('session-token', false, 1);

    expect(result.map((notification) => notification.id)).toEqual(['one']);
  });
});
