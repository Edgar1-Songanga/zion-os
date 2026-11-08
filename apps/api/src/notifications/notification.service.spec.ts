import { NotificationService } from './notification.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

const VIEWER_ID = '11111111-1111-4111-8111-111111111111';
const MUTED_ID = '22222222-2222-4222-8222-222222222222';

describe('NotificationService muted account filtering', () => {
  let service: NotificationService;
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: VIEWER_ID }) };
    service = new NotificationService(identity as never);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get');
  });

  afterEach(() => jest.restoreAllMocks());

  it('filters previously stored social notifications from muted actors', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_user_mutes') return [{ muted_id: MUTED_ID }] as never;
      if (table === 'notifications') return [
        { id: 'hidden', type: 'resa.comment', data: { actor_id: MUTED_ID } },
        { id: 'visible', type: 'resa.comment', data: { actor_id: '33333333-3333-4333-8333-333333333333' } },
        { id: 'system', type: 'system.notice', data: {} },
      ] as never;
      return [] as never;
    });

    const result = await service.list('session-token', false, 50);

    expect(result.map((item) => item.id)).toEqual(['visible', 'system']);
  });

  it('preserves the requested limit when no accounts are muted', async () => {
    getSpy.mockImplementation(async (table: string) => {
      if (table === 'resa_user_mutes') return [] as never;
      if (table === 'notifications') return [{ id: 'first' }, { id: 'second' }] as never;
      return [] as never;
    });

    const result = await service.list('session-token', false, 1);

    expect(result.map((item) => item.id)).toEqual(['first']);
  });
});
