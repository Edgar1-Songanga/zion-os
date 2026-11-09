import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ResaGroupMeetingService } from './resa-group-meeting.service';

const MEETING_ID = '97100000-0000-4000-8000-000000000001';
const HOST_ID = '97000000-0000-4000-8000-000000000001';
const MODERATOR_ID = '97000000-0000-4000-8000-000000000002';
const PARTICIPANT_ID = '97000000-0000-4000-8000-000000000003';

describe('ResaGroupMeetingService', () => {
  let service: ResaGroupMeetingService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;
  let media: {
    createRoom: jest.Mock;
    openRoom: jest.Mock;
    closeRoom: jest.Mock;
    createJoinConfig: jest.Mock;
    setParticipantPermissions: jest.Mock;
    removeParticipant: jest.Mock;
  };
  let actorId = HOST_ID;

  beforeEach(() => {
    actorId = HOST_ID;
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([] as never);
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([] as never);
    media = {
      createRoom: jest.fn().mockResolvedValue({
        provider: 'ZION_SFU',
        providerRoomId: 'zion-group-' + MEETING_ID,
        providerRoomUrl: 'wss://media.example.test',
      }),
      openRoom: jest.fn().mockResolvedValue(undefined),
      closeRoom: jest.fn().mockResolvedValue(undefined),
      createJoinConfig: jest.fn().mockResolvedValue({
        mode: 'SFU', provider: 'ZION_SFU', roomId: 'zion-group-' + MEETING_ID,
        joinUrl: 'wss://media.example.test', token: 'join-token',
      }),
      setParticipantPermissions: jest.fn().mockResolvedValue(undefined),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
    };
    const identity = { getCurrentUser: jest.fn().mockImplementation(async () => ({ id: actorId })) };
    service = new ResaGroupMeetingService(identity as never, media as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('refuses to create group meetings without source-aware LiveKit permissions', async () => {
    media.setParticipantPermissions = undefined as never;

    await expect(service.create('session-token', {
      title: 'Team planning',
      scheduled_at: new Date(Date.now() + 60_000).toISOString(),
    })).rejects.toBeInstanceOf(BadGatewayException);

    expect(postSpy).not.toHaveBeenCalled();
  });

  it('creates a meeting, provisions the SFU room and persists room metadata', async () => {
    postSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, host_user_id: HOST_ID, status: 'SCHEDULED' }] as never)
      .mockResolvedValueOnce([{ meeting_id: MEETING_ID, provider: 'ZION_SFU', status: 'READY' }] as never)
      .mockResolvedValueOnce([{ event_type: 'MEETING_CREATED' }] as never);

    const result = await service.create('session-token', {
      title: 'Team planning',
      scheduled_at: new Date(Date.now() + 60_000).toISOString(),
      visibility: 'INVITE_ONLY',
    });

    expect(media.createRoom).toHaveBeenCalledWith({
      meetingId: MEETING_ID,
      channelName: 'resa:group:' + MEETING_ID,
      maxParticipants: 100,
    });
    expect(postSpy).toHaveBeenNthCalledWith(2, 'resa_group_meeting_rooms', 'session-token',
      expect.objectContaining({ meeting_id: MEETING_ID, provider_room_id: 'zion-group-' + MEETING_ID }));
    expect(result.room.status).toBe('READY');
  });

  it('cancels the meeting and closes the SFU room when room metadata cannot be persisted', async () => {
    postSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, host_user_id: HOST_ID }] as never)
      .mockRejectedValueOnce(new Error('database unavailable'));
    patchSpy.mockResolvedValueOnce([{ id: MEETING_ID, status: 'CANCELLED' }] as never);

    await expect(service.create('session-token', {
      title: 'Team planning',
      scheduled_at: new Date(Date.now() + 60_000).toISOString(),
    })).rejects.toBeInstanceOf(BadGatewayException);

    expect(media.closeRoom).toHaveBeenCalledWith({
      meetingId: MEETING_ID,
      providerRoomId: 'zion-group-' + MEETING_ID,
    });
    expect(patchSpy).toHaveBeenCalledWith('resa_group_meetings', 'session-token',
      { status: 'CANCELLED' }, '?id=eq.' + MEETING_ID);
  });

  it('issues camera and microphone only to ordinary participants', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID, status: 'OPEN', locked: false }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED' }] as never);

    await service.joinConfig('session-token', MEETING_ID);

    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: PARTICIPANT_ID,
      canPublish: true,
      canPublishSources: ['camera', 'microphone'],
      ttl: '10m',
    }));
  });

  it('issues screen video and screen audio only to an explicitly appointed presenter', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PRESENTER', status: 'ACCEPTED' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID, status: 'OPEN', locked: false }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PRESENTER', status: 'ACCEPTED' }] as never);

    await service.joinConfig('session-token', MEETING_ID);

    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: PARTICIPANT_ID,
      canPublish: true,
      canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
      ttl: '10m',
    }));
  });

  it('issues subscribe-only access to viewers', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'VIEWER', status: 'ACCEPTED' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID, status: 'OPEN', locked: false }] as never)
      .mockResolvedValueOnce([{ participant_role: 'VIEWER', status: 'ACCEPTED' }] as never);

    await service.joinConfig('session-token', MEETING_ID);

    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      userId: PARTICIPANT_ID,
      canPublish: false,
      canPublishSources: [],
      ttl: '10m',
    }));
  });

  it('admits a public visitor as a subscribe-only viewer', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, visibility: 'PUBLIC', status: 'OPEN' }] as never)
      .mockResolvedValueOnce([] as never);
    postSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID, participant_role: 'VIEWER', status: 'ACCEPTED',
    }] as never);

    const result = await service.joinPublic('session-token', MEETING_ID);

    expect(postSpy).toHaveBeenCalledWith('resa_group_meeting_participants', 'session-token', {
      meeting_id: MEETING_ID,
      user_id: PARTICIPANT_ID,
      participant_role: 'VIEWER',
      status: 'ACCEPTED',
    });
    expect(result.participant_role).toBe('VIEWER');
  });

  it('does not admit public viewers to private meetings', async () => {
    actorId = PARTICIPANT_ID;
    getSpy.mockResolvedValueOnce([{ id: MEETING_ID, visibility: 'INVITE_ONLY', status: 'OPEN' }] as never);

    await expect(service.joinPublic('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects joining a locked meeting room', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID, status: 'OPEN', locked: true }] as never);

    await expect(service.joinConfig('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.createJoinConfig).not.toHaveBeenCalled();
  });

  it('asks LiveKit to revoke cached credentials when removing an offline accepted participant', async () => {
    actorId = HOST_ID;
    getSpy
      .mockResolvedValueOnce([{ participant_role: 'HOST', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED', joined_at: null }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID }] as never);
    media.removeParticipant.mockResolvedValueOnce(undefined);
    patchSpy.mockResolvedValueOnce([{ user_id: PARTICIPANT_ID, status: 'REMOVED' }] as never);
    postSpy.mockResolvedValueOnce([{ event_type: 'PARTICIPANT_REMOVED' }] as never);

    await service.removeParticipant('session-token', MEETING_ID, PARTICIPANT_ID);

    expect(patchSpy).toHaveBeenCalledWith('resa_group_meeting_participants', 'session-token',
      { status: 'REMOVED' }, expect.stringContaining('user_id=eq.' + PARTICIPANT_ID));
    expect(patchSpy.mock.invocationCallOrder[0]).toBeLessThan(media.removeParticipant.mock.invocationCallOrder[0]);
    expect(media.removeParticipant).toHaveBeenCalledWith({
      roomId: 'zion-group-' + MEETING_ID,
      identity: PARTICIPANT_ID,
    });
  });

  it('does not issue a join token to a participant who has been removed', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'REMOVED' }] as never);

    await expect(service.joinConfig('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.createJoinConfig).not.toHaveBeenCalled();
  });

  it('does not return a join token if removal wins while LiveKit credentials are being minted', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN', title: 'Team planning' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID, status: 'OPEN', locked: false }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'REMOVED' }] as never);

    await expect(service.joinConfig('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.createJoinConfig).toHaveBeenCalledTimes(1);
  });

  it('does not expose meeting chat to invited users before they accept', async () => {
    actorId = PARTICIPANT_ID;
    getSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID,
      participant_role: 'PARTICIPANT', status: 'INVITED',
    }] as never);

    await expect(service.messages('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow invited users to send meeting chat messages before accepting', async () => {
    actorId = PARTICIPANT_ID;
    getSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID,
      participant_role: 'PARTICIPANT', status: 'INVITED',
    }] as never);

    await expect(service.sendMessage('session-token', MEETING_ID, 'Not yet admitted'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('allows a participant already marked present to reconnect', async () => {
    actorId = PARTICIPANT_ID;
    patchSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID, status: 'PRESENT',
    }] as never);
    postSpy.mockResolvedValueOnce([{ event_type: 'PARTICIPANT_JOINED' }] as never);

    const result = await service.setPresence('session-token', MEETING_ID, 'PRESENT');

    expect(patchSpy).toHaveBeenCalledWith('resa_group_meeting_participants', 'session-token',
      expect.objectContaining({ status: 'PRESENT' }),
      expect.stringContaining('status=in.(ACCEPTED,PRESENT,LEFT)'));
    expect(result.status).toBe('PRESENT');
  });

  it('updates live SFU permissions before persisting presenter promotion', async () => {
    actorId = MODERATOR_ID;
    getSpy
      .mockResolvedValueOnce([{ participant_role: 'MODERATOR', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'PRESENT', joined_at: new Date().toISOString() }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID }] as never);
    patchSpy.mockResolvedValueOnce([{ participant_role: 'PRESENTER', status: 'PRESENT' }] as never);
    postSpy.mockResolvedValueOnce([{ event_type: 'ROLE_CHANGED' }] as never);

    await service.setPresenter('session-token', MEETING_ID, PARTICIPANT_ID, true);

    expect(media.setParticipantPermissions).toHaveBeenCalledWith({
      roomId: 'zion-group-' + MEETING_ID,
      identity: PARTICIPANT_ID,
      canPublish: true,
      canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
    });
    expect(patchSpy).toHaveBeenCalledWith('resa_group_meeting_participants', 'session-token',
      { participant_role: 'PRESENTER' }, expect.stringContaining('user_id=eq.' + PARTICIPANT_ID));
  });

  it('does not grant screen-share sources when presenter promotion is revoked', async () => {
    actorId = MODERATOR_ID;
    getSpy
      .mockResolvedValueOnce([{ participant_role: 'MODERATOR', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PRESENTER', status: 'PRESENT', joined_at: new Date().toISOString() }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'zion-group-' + MEETING_ID }] as never);
    patchSpy.mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'PRESENT' }] as never);
    postSpy.mockResolvedValueOnce([{ event_type: 'ROLE_CHANGED' }] as never);

    await service.setPresenter('session-token', MEETING_ID, PARTICIPANT_ID, false);

    expect(media.setParticipantPermissions).toHaveBeenCalledWith({
      roomId: 'zion-group-' + MEETING_ID,
      identity: PARTICIPANT_ID,
      canPublish: true,
      canPublishSources: ['camera', 'microphone'],
    });
  });

  it('does not attempt an SFU permission update for an offline participant', async () => {
    actorId = MODERATOR_ID;
    getSpy
      .mockResolvedValueOnce([{ participant_role: 'MODERATOR', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ participant_role: 'PARTICIPANT', status: 'ACCEPTED', joined_at: null }] as never);
    patchSpy.mockResolvedValueOnce([{ participant_role: 'PRESENTER', status: 'ACCEPTED' }] as never);
    postSpy.mockResolvedValueOnce([{ event_type: 'ROLE_CHANGED' }] as never);

    await service.setPresenter('session-token', MEETING_ID, PARTICIPANT_ID, true);

    expect(media.setParticipantPermissions).not.toHaveBeenCalled();
    expect(patchSpy).toHaveBeenCalledWith('resa_group_meeting_participants', 'session-token',
      { participant_role: 'PRESENTER' }, expect.stringContaining('user_id=eq.' + PARTICIPANT_ID));
  });
  it('persists one active hand raise for an accepted participant in an open meeting', async () => {
    actorId = PARTICIPANT_ID;
    getSpy
      .mockResolvedValueOnce([{
        meeting_id: MEETING_ID, user_id: PARTICIPANT_ID,
        participant_role: 'PARTICIPANT', status: 'PRESENT',
      }] as never)
      .mockResolvedValueOnce([{ id: MEETING_ID, status: 'OPEN' }] as never)
      .mockResolvedValueOnce([] as never);
    postSpy.mockResolvedValueOnce([{
      id: 'hand-raise-1', meeting_id: MEETING_ID, user_id: PARTICIPANT_ID, status: 'WAITING',
    }] as never);

    const result = await service.raiseHand('session-token', MEETING_ID);

    expect(postSpy).toHaveBeenCalledWith('resa_group_meeting_hand_raises', 'session-token', {
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID, status: 'WAITING',
    });
    expect(result.status).toBe('WAITING');
  });

  it('does not allow invited users to raise a hand', async () => {
    actorId = PARTICIPANT_ID;
    getSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID,
      participant_role: 'PARTICIPANT', status: 'INVITED',
    }] as never);

    await expect(service.raiseHand('session-token', MEETING_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('allows only a meeting moderator to resolve a pending hand raise', async () => {
    actorId = MODERATOR_ID;
    getSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: MODERATOR_ID,
      participant_role: 'MODERATOR', status: 'PRESENT',
    }] as never);
    patchSpy.mockResolvedValueOnce([{
      meeting_id: MEETING_ID, user_id: PARTICIPANT_ID, status: 'ACKNOWLEDGED',
    }] as never);

    const result = await service.resolveHandRaise('session-token', MEETING_ID, PARTICIPANT_ID, 'ACKNOWLEDGED');

    expect(patchSpy).toHaveBeenCalledWith('resa_group_meeting_hand_raises', 'session-token',
      { status: 'ACKNOWLEDGED' },
      `?meeting_id=eq.${MEETING_ID}&user_id=eq.${PARTICIPANT_ID}&status=eq.WAITING`);
    expect(result.status).toBe('ACKNOWLEDGED');
  });

});
