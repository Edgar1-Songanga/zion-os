const mockUpdateParticipant = jest.fn();

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(),
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    updateParticipant: mockUpdateParticipant,
  })),
  TrackSource: {
    CAMERA: 'CAMERA',
    MICROPHONE: 'MICROPHONE',
    SCREEN_SHARE: 'SCREEN_SHARE',
    SCREEN_SHARE_AUDIO: 'SCREEN_SHARE_AUDIO',
  },
}));

import { env } from '../../config/env';
import { RoomServiceClient } from 'livekit-server-sdk';
import { ZionSfuProvider } from './zion-sfu.provider';

describe('ZionSfuProvider source-scoped participant permissions', () => {
  const provider = new ZionSfuProvider();

  beforeEach(() => {
    env.livekitUrl = 'wss://livekit.example.test';
    env.livekitApiKey = 'test-api-key';
    env.livekitApiSecret = 'test-api-secret';
    mockUpdateParticipant.mockReset().mockResolvedValue(undefined);
    (RoomServiceClient as unknown as jest.Mock).mockClear();
  });

  it('keeps the legacy publishing grant limited to camera and microphone', async () => {
    await provider.setParticipantPublishing({
      roomId: 'room-1',
      identity: 'participant-1',
      canPublish: true,
    });

    expect(mockUpdateParticipant).toHaveBeenCalledWith('room-1', 'participant-1', {
      permission: {
        canPublish: true,
        canPublishSources: ['CAMERA', 'MICROPHONE'],
        canSubscribe: true,
        canPublishData: true,
      },
    });
  });

  it('grants screen video and screen audio only when explicitly requested', async () => {
    await provider.setParticipantPermissions({
      roomId: 'room-1',
      identity: 'presenter-1',
      canPublish: true,
      canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
    });

    expect(mockUpdateParticipant).toHaveBeenCalledWith('room-1', 'presenter-1', {
      permission: {
        canPublish: true,
        canPublishSources: ['CAMERA', 'MICROPHONE', 'SCREEN_SHARE', 'SCREEN_SHARE_AUDIO'],
        canSubscribe: true,
        canPublishData: true,
      },
    });
  });

  it('revokes all publishing sources without leaving stale presenter permissions', async () => {
    await provider.setParticipantPermissions({
      roomId: 'room-1',
      identity: 'former-presenter',
      canPublish: false,
      canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
    });

    expect(mockUpdateParticipant).toHaveBeenCalledWith('room-1', 'former-presenter', {
      permission: {
        canPublish: false,
        canSubscribe: true,
        canPublishData: true,
      },
    });
  });

  it('wraps SFU permission failures as gateway errors', async () => {
    mockUpdateParticipant.mockRejectedValueOnce(new Error('SFU unavailable'));

    await expect(provider.setParticipantPermissions({
      roomId: 'room-1',
      identity: 'participant-1',
      canPublish: true,
      canPublishSources: ['screen_share', 'screen_share_audio'],
    })).rejects.toThrow('SFU unavailable');
  });
});
