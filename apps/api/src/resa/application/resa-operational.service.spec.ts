import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResaOperationalService } from './resa-operational.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const LIVE_ID = '11111111-1111-4111-8111-111111111111';
const CONVERSATION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR_ID = '33333333-3333-4333-8333-333333333333';
const TARGET_ID = '44444444-4444-4444-8444-444444444444';

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
    jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([] as never);
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
      name: expect.any(String),
      canPublish: true,
    }));
  });

  it('allows a non-host organization member to join an organization-scoped live returned by RLS', async () => {
    actorId = 'organization-member';
    getSpy.mockResolvedValueOnce([{
      id: LIVE_ID,
      host_id: 'host-user',
      status: 'live',
      visibility: 'organization',
      organization_id: '55555555-5555-4555-8555-555555555555',
    }] as never);

    const config = await service.liveJoinConfig('session-token', LIVE_ID);

    expect(config.isHost).toBe(false);
    expect(config.role).toBe('viewer');
    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'organization-member',
      name: expect.any(String),
      canPublish: true,
    }));
  });

  it('does not issue join credentials for a private live to a non-host', async () => {
    actorId = 'uninvited-viewer';
    getSpy.mockResolvedValueOnce([] as never);

    await expect(service.liveJoinConfig('session-token', LIVE_ID)).rejects.toBeInstanceOf(NotFoundException);

    expect(media.createJoinConfig).not.toHaveBeenCalled();
  });

  it('does not issue join credentials for a followers-only live to a non-host', async () => {
    actorId = 'non-follower';
    getSpy.mockResolvedValueOnce([] as never);

    await expect(service.liveJoinConfig('session-token', LIVE_ID)).rejects.toBeInstanceOf(NotFoundException);

    expect(media.createJoinConfig).not.toHaveBeenCalled();
  });

  it('does not expose chat messages for a private live to a non-host', async () => {
    actorId = 'uninvited-viewer';
    getSpy.mockResolvedValueOnce([{
      id: LIVE_ID,
      host_id: 'host-user',
      status: 'live',
      visibility: 'private',
    }] as never);

    await expect(service.listLiveChatMessages('session-token', LIVE_ID)).rejects.toBeInstanceOf(NotFoundException);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).not.toHaveBeenCalledWith('resa_live_chat_messages', expect.anything(), expect.anything());
  });

  it('requires an organization id when creating an organization-only live', async () => {
    await expect(service.createLiveSession('session-token', {
      title: 'Culto de oração',
      visibility: 'organization',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(getSpy).not.toHaveBeenCalled();
    expect(media.createRoom).not.toHaveBeenCalled();
  });

  it('requires organization context when a department is selected for a live', async () => {
    await expect(service.createLiveSession('session-token', {
      title: 'Reunião departamental',
      visibility: 'public',
      organization_unit_id: '55555555-5555-4555-8555-555555555555',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(media.createRoom).not.toHaveBeenCalled();
  });

  it('requires organization context when a ministry is selected for a live', async () => {
    await expect(service.createLiveSession('session-token', {
      title: 'Ministério Jovem',
      visibility: 'public',
      ministry_id: '66666666-6666-4666-8666-666666666666',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(media.createRoom).not.toHaveBeenCalled();
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

  it('creates a conversation through one atomic RPC and deduplicates participant ids', async () => {
    actorId = ACTOR_ID;
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc')
      .mockResolvedValue({ id: CONVERSATION_ID, kind: 'direct' } as never);

    const result = await service.createConversation('session-token', [TARGET_ID, TARGET_ID, ACTOR_ID], '  Direct chat  ');

    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('resa_create_conversation', 'session-token', {
      p_member_ids: [TARGET_ID],
      p_title: 'Direct chat',
    });
    expect(getSpy).not.toHaveBeenCalled();
    expect(result.id).toBe(CONVERSATION_ID);
  });

  it('rejects creating a conversation with no other participant', async () => {
    actorId = ACTOR_ID;
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue(null as never);

    await expect(service.createConversation('session-token', [ACTOR_ID])).rejects.toBeInstanceOf(BadRequestException);

    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('does not return an empty message list to a non-member', async () => {
    actorId = ACTOR_ID;
    getSpy.mockResolvedValueOnce([] as never);

    await expect(service.listMessages('session-token', CONVERSATION_ID)).rejects.toBeInstanceOf(NotFoundException);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(
      'resa_conversation_members',
      'session-token',
      expect.stringContaining(`conversation_id=eq.${CONVERSATION_ID}`),
    );
  });
});
