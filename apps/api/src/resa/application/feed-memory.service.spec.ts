import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ResaFeedMemoryService } from './feed-memory.service';

describe('ResaFeedMemoryService creator analytics', () => {
  const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: 'creator-1' }) };
  let service: ResaFeedMemoryService;
  let rpcSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResaFeedMemoryService(identity as unknown as IdentityService);
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([
      { metric_date: '2026-11-10', unique_viewers: 8, views: 13, completed_views: 5, watch_seconds: 420 },
    ] as never);
  });

  afterEach(() => {
    rpcSpy.mockRestore();
  });

  it('returns only the aggregate analytics contract for the authenticated creator', async () => {
    const result = await service.creatorAnalytics('session-token', '2026-11-01', '2026-11-10');

    expect(identity.getCurrentUser).toHaveBeenCalledWith('session-token');
    expect(rpcSpy).toHaveBeenCalledWith('resa_creator_analytics', 'session-token', {
      p_from: '2026-11-01',
      p_to: '2026-11-10',
    });
    expect(result).toEqual({
      from: '2026-11-01',
      to: '2026-11-10',
      privacy_threshold: 5,
      items: [{ metric_date: '2026-11-10', unique_viewers: 8, views: 13, completed_views: 5, watch_seconds: 420 }],
    });
  });

  it('rejects invalid or overlong periods before querying analytics', async () => {
    await expect(service.creatorAnalytics('session-token', '2026-08-01', '2026-11-10'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.creatorAnalytics('session-token', '2026-11-31', '2026-11-10'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers before querying analytics', async () => {
    identity.getCurrentUser.mockRejectedValueOnce(new Error('unauthorized'));
    await expect(service.creatorAnalytics('invalid-token', '2026-11-01', '2026-11-10'))
      .rejects.toThrow('unauthorized');
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
