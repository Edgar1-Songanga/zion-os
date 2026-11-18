import { ResaMediaModerationService } from './resa-media-moderation.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { env } from '../../config/env';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_PATH = ACTOR_ID + '/22222222-2222-4222-8222-222222222222.jpg';

describe('ResaMediaModerationService', () => {
  let service: ResaMediaModerationService;
  const originalEnv = {
    resaMediaModerationUrl: env.resaMediaModerationUrl,
    resaMediaModerationSecret: env.resaMediaModerationSecret,
    resaMediaModerationTokenSecret: env.resaMediaModerationTokenSecret,
  };

  beforeEach(() => {
    Object.assign(env, {
      resaMediaModerationUrl: 'https://moderation.internal',
      resaMediaModerationSecret: 'worker-secret',
      resaMediaModerationTokenSecret: 'a'.repeat(64),
    });
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: ACTOR_ID }) };
    service = new ResaMediaModerationService(identity as never);
    jest.spyOn(SupabaseRestClient.prototype, 'createSignedStorageUrl')
      .mockResolvedValue('https://storage.internal/signed/short-lived');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.assign(env, originalEnv);
  });

  function providerResponse(overrides: Record<string, unknown> = {}) {
    return {
      decision: 'approved',
      confidence: 0.97,
      provider: 'self-hosted-vision',
      model_version: 'nudenet-checked-build-1',
      policy_version: 'resa-explicit-sexual-nudity-v1',
      detected_mime_type: 'image/jpeg',
      bytes_processed: 1024,
      categories: ['safe'],
      ...overrides,
    };
  }

  it('issues a short-lived proof bound to the authenticated user and exact object', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => providerResponse(),
    } as Response);

    const result = await service.moderate('session-token', {
      media_path: IMAGE_PATH,
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
    });
    const claims = service.verifyApprovalToken(result.moderation_token, {
      userId: ACTOR_ID,
      mediaPath: IMAGE_PATH,
      mediaType: 'image',
    });

    expect(result.approved).toBe(true);
    expect(claims.provider).toBe('self-hosted-vision');
    expect(claims.modelVersion).toBe('nudenet-checked-build-1');
    expect(claims.exp - claims.issuedAt).toBe(600);
  });

  it('rejects explicit sexual content without issuing an approval proof', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => providerResponse({ decision: 'rejected', categories: ['explicit_nudity'] }),
    } as Response);

    await expect(service.moderate('session-token', {
      media_path: IMAGE_PATH,
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
    })).rejects.toThrow('conteúdo sexual explícito');
  });

  it('fails closed when the classifier response is incomplete or has a MIME mismatch', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => providerResponse({ detected_mime_type: 'image/png' }),
    } as Response);

    await expect(service.moderate('session-token', {
      media_path: IMAGE_PATH,
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
    })).rejects.toThrow('resultado verificável');
  });

  it('fails closed when video analysis does not cover the full duration', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => providerResponse({
        detected_mime_type: 'video/mp4',
        frames_analyzed: 2,
        coverage_ratio: 0.4,
      }),
    } as Response);

    await expect(service.moderate('session-token', {
      media_path: ACTOR_ID + '/22222222-2222-4222-8222-222222222222.mp4',
      media_type: 'video',
      mime_type: 'video/mp4',
      file_size: 1024,
    })).rejects.toThrow('não cobriu suficientemente');
  });

  it('rejects a valid approval proof if it is replayed for another object', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => providerResponse(),
    } as Response);
    const result = await service.moderate('session-token', {
      media_path: IMAGE_PATH,
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
    });

    expect(() => service.verifyApprovalToken(result.moderation_token, {
      userId: ACTOR_ID,
      mediaPath: ACTOR_ID + '/33333333-3333-4333-8333-333333333333.jpg',
      mediaType: 'image',
    })).toThrow('não corresponde');
  });

  it('rejects files outside the uploader namespace before calling the provider', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(service.moderate('session-token', {
      media_path: '33333333-3333-4333-8333-333333333333/other.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
    })).rejects.toThrow('não pertence à conta');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
