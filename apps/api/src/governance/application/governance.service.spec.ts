import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { GovernanceService } from './governance.service';

const MEETING_ID = '97000000-0000-4000-8000-000000000001';
const USER_ID = '97000000-0000-4000-8000-000000000002';

describe('GovernanceService mediaJoinConfig', () => {
  let service: GovernanceService;
  let getSpy: jest.SpyInstance;
  let media: { createJoinConfig: jest.Mock; removeParticipant: jest.Mock };
  const participant = (role: string, status = 'PRESENT') => ({
    id: 'participant-row',
    participant_role: role,
    status,
  });

  beforeEach(() => {
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    media = {
      removeParticipant: jest.fn().mockResolvedValue(undefined),
      createJoinConfig: jest.fn().mockResolvedValue({
        mode: 'SFU',
        provider: 'ZION_SFU',
        roomId: 'zion-meeting-' + MEETING_ID,
        joinUrl: 'wss://media.example.test',
        token: 'short-lived-token',
      }),
    };
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: USER_ID }) };
    service = new GovernanceService(identity as never, media as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['HOST', 'MODERATOR'])('grants %s camera, microphone and screen-share publishing', async (role) => {
    getSpy
      .mockResolvedValueOnce([{ status: 'OPEN', locked: false, provider_room_id: 'room-1' }] as never)
      .mockResolvedValueOnce([participant(role)] as never)
      .mockResolvedValueOnce([participant(role)] as never);

    await service.mediaJoinConfig('session-token', MEETING_ID);

    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      meetingId: MEETING_ID,
      providerRoomId: 'room-1',
      userId: USER_ID,
      ttl: '10m',
      canPublish: true,
      canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
    }));
  });

  it('keeps ordinary participants on camera and microphone only', async () => {
    getSpy
      .mockResolvedValueOnce([{ status: 'OPEN', locked: false, provider_room_id: 'room-1' }] as never)
      .mockResolvedValueOnce([participant('PARTICIPANT')] as never)
      .mockResolvedValueOnce([participant('PARTICIPANT')] as never);

    await service.mediaJoinConfig('session-token', MEETING_ID);

    expect(media.createJoinConfig).toHaveBeenCalledWith(expect.objectContaining({
      canPublish: true,
      canPublishSources: ['camera', 'microphone'],
      ttl: '10m',
    }));
  });

  it('does not issue credentials to a removed participant', async () => {
    getSpy
      .mockResolvedValueOnce([{ status: 'OPEN', locked: false, provider_room_id: 'room-1' }] as never)
      .mockResolvedValueOnce([participant('PARTICIPANT', 'REMOVED')] as never);

    await expect(service.mediaJoinConfig('session-token', MEETING_ID))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(media.createJoinConfig).not.toHaveBeenCalled();
  });

  it('rejects credentials if the participant role changes while the token is minted', async () => {
    getSpy
      .mockResolvedValueOnce([{ status: 'OPEN', locked: false, provider_room_id: 'room-1' }] as never)
      .mockResolvedValueOnce([participant('HOST')] as never)
      .mockResolvedValueOnce([participant('PARTICIPANT')] as never);

    await expect(service.mediaJoinConfig('session-token', MEETING_ID))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects credentials if the participant is removed while the token is minted', async () => {
    getSpy
      .mockResolvedValueOnce([{ status: 'OPEN', locked: false, provider_room_id: 'room-1' }] as never)
      .mockResolvedValueOnce([participant('MODERATOR')] as never)
      .mockResolvedValueOnce([participant('MODERATOR', 'REMOVED')] as never);

    await expect(service.mediaJoinConfig('session-token', MEETING_ID))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});


describe('GovernanceService participant removal', () => {
  afterEach(() => jest.restoreAllMocks());

  it('evicts a removed participant from the active SFU room', async () => {
    const getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get')
      .mockResolvedValueOnce([{ id: 'moderator-row', participant_role: 'HOST', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ id: 'target-row', status: 'PRESENT' }] as never)
      .mockResolvedValueOnce([{ provider_room_id: 'room-1' }] as never);
    const upsertSpy = jest.spyOn(SupabaseRestClient.prototype, 'upsert')
      .mockResolvedValue([{ meeting_id: MEETING_ID, user_id: 'target-user', removed: true }] as never);
    const patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch')
      .mockResolvedValue([] as never);
    const postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post')
      .mockResolvedValue([{}] as never);
    const media = {
      createJoinConfig: jest.fn(),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
    };
    const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: USER_ID }) };
    const service = new GovernanceService(identity as never, media as never);

    await service.moderateParticipant('session-token', MEETING_ID, 'target-user', { removed: true });

    expect(patchSpy).toHaveBeenCalledWith(
      'governance_meeting_participants',
      'session-token',
      expect.objectContaining({ status: 'REMOVED' }),
      expect.stringContaining('user_id=eq.target-user'),
    );
    expect(media.removeParticipant).toHaveBeenCalledWith({
      roomId: 'room-1',
      identity: 'target-user',
    });
    expect(postSpy).toHaveBeenCalledWith(
      'governance_meeting_room_events',
      'session-token',
      expect.objectContaining({ event_type: 'MODERATOR_ACTION' }),
    );
    expect(getSpy).toHaveBeenCalledTimes(3);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
  });
});


describe('GovernanceService atomic decisions and minutes', () => {
  const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: USER_ID }) };
  const media = { createJoinConfig: jest.fn(), removeParticipant: jest.fn() };

  afterEach(() => jest.restoreAllMocks());

  it('records a motion decision through one database transaction', async () => {
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([{
      id: 'decision-row',
      motion_id: '97000000-0000-4000-8000-000000000003',
      outcome: 'APPROVED',
      yes_count: 4,
      no_count: 1,
      abstain_count: 0,
      quorum_met: true,
    }] as never);
    const postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post');
    const service = new GovernanceService(identity as never, media as never);

    await expect(service.decide('session-token', '97000000-0000-4000-8000-000000000003', 'APPROVED'))
      .resolves.toMatchObject({ outcome: 'APPROVED', quorum_met: true });

    expect(rpcSpy).toHaveBeenCalledWith('record_governance_decision', 'session-token', {
      p_motion_id: '97000000-0000-4000-8000-000000000003',
      p_outcome: 'APPROVED',
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid decision outcomes before calling the database', async () => {
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc');
    const service = new GovernanceService(identity as never, media as never);

    await expect(service.decide('session-token', '97000000-0000-4000-8000-000000000003', 'PENDING'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('saves minutes through the atomic RPC and preserves the requested status', async () => {
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([{
      id: 'minutes-row',
      meeting_id: MEETING_ID,
      status: 'DRAFT',
      content: 'Minutes content',
    }] as never);
    const postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post');
    const patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch');
    const service = new GovernanceService(identity as never, media as never);

    await expect(service.saveMinutes('session-token', MEETING_ID, 'Minutes content', 'DRAFT'))
      .resolves.toMatchObject({ status: 'DRAFT', content: 'Minutes content' });

    expect(rpcSpy).toHaveBeenCalledWith('save_governance_minutes', 'session-token', {
      p_meeting_id: MEETING_ID,
      p_content: 'Minutes content',
      p_status: 'DRAFT',
    });
    expect(postSpy).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('does not send unsupported minutes states to the database', async () => {
    const rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc');
    const service = new GovernanceService(identity as never, media as never);

    await expect(service.saveMinutes('session-token', MEETING_ID, 'Minutes content', 'PUBLISHED'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
