import { BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

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
