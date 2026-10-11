import { NotFoundException } from '@nestjs/common';
import { ResaOperationalService } from './resa-operational.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const LIVE_ID = '11111111-1111-4111-8111-111111111111';

describe('ResaOperationalService live permissions', () => {
  let service: ResaOperationalService;
  let getSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;
  let media: {
    createRoom: jest.Mock;
    closeRoom: jest.Mock;
    createJoinConfig: jest.Mock;
    setParticipantPublishing: jest.Mock;
    removeParticipant: jest.Mock;
  };
  let actorId = 'host-user';

  beforeEach(() => {
    actorId = 'host-user';
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([] as never);
    media = {
      createRoom: jest.fn(),
      closeRoom: jest.fn().mockResolvedValue(undefined),
      createJoinConfig: jest.fn().mockResolvedValue({ mode: 'SFU', provider: 'ZION_SFU', roomId: 'zion-live-' + LIVE_ID, joinUrl: 'wss://media.example', token: 'token' }),
      setParticipantPublishing: jest.fn().mockResolvedValue(undefined),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
    };
    const identity = { getCurrentUser: jest.fn().mockImplementation(async () => ({ id: actorId })) };
    service = new ResaOperationalService(identity as never, media as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('issues publishing permission to the host only', async () => {
    getSpy.mockResolvedValueOnce([{ id: LIVE_ID, host_id: actorId, status: 'live', visibility: 'public' }] as never);

    const config = await service.liveJoinConfig('session-token', LIVE_ID);

    expect(config.isHost).toBe(true);
    expect(config.role).toBe('host');
    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: actorId,
      canPublish: true,
      providerRoomId: 'zion-live-' + LIVE_ID,
    }));
  });

  it('joins a public live as a non-publishing viewer', async () => {
    actorId = 'viewer-user';
    getSpy.mockResolvedValueOnce([{ id: LIVE_ID, host_id: 'host-user', status: 'live', visibility: 'public' }] as never);

    const config = await service.liveJoinConfig('session-token', LIVE_ID);

    expect(config.isHost).toBe(false);
    expect(config.role).toBe('viewer');
    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'viewer-user',
      canPublish: false,
    }));
  });

  it('refuses a non-host attempt to end a live before touching the media room', async () => {
    actorId = 'viewer-user';
    getSpy.mockResolvedValueOnce([] as never);

    await expect(service.updateLiveStatus('session-token', LIVE_ID, 'ended')).rejects.toBeInstanceOf(NotFoundException);

    expect(media.closeRoom).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('closes the media room before persisting the ended state for the host', async () => {
    getSpy.mockResolvedValueOnce([{ id: LIVE_ID, host_id: actorId, status: 'live' }] as never);
    patchSpy.mockResolvedValueOnce([{ id: LIVE_ID, status: 'ended' }] as never);

    const result = await service.updateLiveStatus('session-token', LIVE_ID, 'ended');

    expect(media.closeRoom).toHaveBeenCalledWith({ meetingId: LIVE_ID, providerRoomId: 'zion-live-' + LIVE_ID });
    expect(patchSpy).toHaveBeenCalledWith(
      'resa_live_sessions',
      'session-token',
      expect.objectContaining({ status: 'ended', ended_at: expect.any(String) }),
      expect.stringContaining('host_id=eq.host-user'),
    );
    expect(result.status).toBe('ended');
  });
});
