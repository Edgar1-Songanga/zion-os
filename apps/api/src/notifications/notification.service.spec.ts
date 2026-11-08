import { BadRequestException } from '@nestjs/common';
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

describe('NotificationService preferences', () => {
  const ACTOR_ID = 'a1111111-1111-4111-8111-111111111111';
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService({ getCurrentUser: jest.fn().mockResolvedValue({ id: ACTOR_ID }) } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('persists sound, vibration and quiet-hour settings for the authenticated account', async () => {
    const upsert = jest.spyOn(SupabaseRestClient.prototype, 'upsert').mockResolvedValue([{
      user_id: ACTOR_ID, sound_enabled: false, vibration_enabled: true, quiet_start: '22:00', quiet_end: '07:00',
    }] as never);

    const result = await service.updatePreferences('session-token', {
      sound_enabled: false,
      vibration_enabled: true,
      quiet_start: '22:00',
      quiet_end: '07:00',
    });

    expect(upsert).toHaveBeenCalledWith('notification_preferences', 'session-token', {
      user_id: ACTOR_ID,
      sound_enabled: false,
      vibration_enabled: true,
      quiet_start: '22:00',
      quiet_end: '07:00',
    }, '?on_conflict=user_id');
    expect(result).toMatchObject({ sound_enabled: false, vibration_enabled: true });
  });

  it('rejects malformed quiet-hour values before writing preferences', async () => {
    const upsert = jest.spyOn(SupabaseRestClient.prototype, 'upsert');
    await expect(service.updatePreferences('session-token', { quiet_start: '25:99' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns the authenticated member timezone with safe defaults', async () => {
    jest.spyOn(SupabaseRestClient.prototype, 'get').mockImplementation(async (table: string) => {
      if (table === 'profiles') return [{ timezone: 'Africa/Luanda' }] as never;
      return [] as never;
    });
    const result = await service.preferences('session-token');
    expect(result).toMatchObject({
      user_id: ACTOR_ID,
      enabled: true,
      channels: ['in_app'],
      sound_enabled: true,
      vibration_enabled: true,
      timezone: 'Africa/Luanda',
    });
  });
});
