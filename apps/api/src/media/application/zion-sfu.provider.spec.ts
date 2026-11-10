const mockUpdateParticipant = jest.fn();
const mockCreateRoom = jest.fn();
const mockRemoveParticipant = jest.fn();
const mockListParticipants = jest.fn();
const mockMutePublishedTrack = jest.fn();

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(),
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    updateParticipant: mockUpdateParticipant,
    createRoom: mockCreateRoom,
    removeParticipant: mockRemoveParticipant,
    listParticipants: mockListParticipants,
    mutePublishedTrack: mockMutePublishedTrack,
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
    mockCreateRoom.mockReset().mockResolvedValue({ name: 'zion-meeting-1' });
    mockRemoveParticipant.mockReset().mockResolvedValue(undefined);
    mockListParticipants.mockReset().mockResolvedValue([]);
    mockMutePublishedTrack.mockReset().mockResolvedValue(undefined);
    (RoomServiceClient as unknown as jest.Mock).mockClear();
  });

  it('applies the requested participant capacity when creating a LiveKit room', async () => {
    const room = await provider.createRoom({
      meetingId: 'meeting-1',
      channelName: 'resa:group:meeting-1',
      maxParticipants: 40,
    });

    expect(mockCreateRoom).toHaveBeenCalledWith({
      name: 'zion-meeting-1',
      emptyTimeout: 10 * 60,
      maxParticipants: 40,
      metadata: JSON.stringify({ meeting_id: 'meeting-1', channel_name: 'resa:group:meeting-1' }),
    });
    expect(room.providerRoomId).toBe('zion-meeting-1');
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

  it('mutes only microphone tracks for a connected participant', async () => {
    mockListParticipants.mockResolvedValueOnce([{
      identity: 'participant-1',
      tracks: [
        { sid: 'audio-1', source: 'MICROPHONE', type: 'AUDIO' },
        { sid: 'video-1', source: 'CAMERA', type: 'VIDEO' },
      ],
    }]);
    await provider.setParticipantAudioMuted({ roomId: 'room-1', identity: 'participant-1', muted: true });
    expect(mockMutePublishedTrack).toHaveBeenCalledTimes(1);
    expect(mockMutePublishedTrack).toHaveBeenCalledWith('room-1', 'participant-1', 'audio-1', true);
  });

  it('recognizes the numeric LiveKit microphone source enum', async () => {
    mockListParticipants.mockResolvedValueOnce([{
      identity: 'participant-1',
      tracks: [{ sid: 'audio-enum', source: 2, type: 'AUDIO' }],
    }]);
    await provider.setParticipantAudioMuted({ roomId: 'room-1', identity: 'participant-1', muted: false });
    expect(mockMutePublishedTrack).toHaveBeenCalledWith('room-1', 'participant-1', 'audio-enum', false);
  });

  it('rejects audio moderation when the participant has no active audio track', async () => {
    mockListParticipants.mockResolvedValueOnce([{ identity: 'participant-1', tracks: [{ sid: 'video-1', source: 'CAMERA', type: 'VIDEO' }] }]);
    await expect(provider.setParticipantAudioMuted({ roomId: 'room-1', identity: 'participant-1', muted: true }))
      .rejects.toThrow('Participant has no active audio track');
  });

  it('treats an already-offline participant as removed after requesting token revocation', async () => {
    mockRemoveParticipant.mockRejectedValueOnce(new Error('participant does not exist'));

    await expect(provider.removeParticipant({ roomId: 'room-1', identity: 'offline-user' }))
      .resolves.toBeUndefined();
    expect(mockRemoveParticipant).toHaveBeenCalledWith('room-1', 'offline-user');
  });

  it('wraps unexpected participant removal failures as gateway errors', async () => {
    mockRemoveParticipant.mockRejectedValueOnce(new Error('SFU unavailable'));

    await expect(provider.removeParticipant({ roomId: 'room-1', identity: 'participant-1' }))
      .rejects.toThrow('SFU unavailable');
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
