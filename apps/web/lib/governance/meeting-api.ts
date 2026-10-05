import { resaRequest } from "@/lib/resa/api";

export type MeetingParticipantControl = {
  meeting_id: string;
  user_id: string;
  mic_muted: boolean;
  camera_enabled: boolean;
  screen_sharing: boolean;
  hand_raised: boolean;
  removed: boolean;
};

export type MeetingParticipant = {
  id: string;
  user_id: string;
  participant_role: string;
  status: string;
};

async function request<T>(meetingId: string, path: string, init?: RequestInit): Promise<T> {
  return resaRequest<T>(`/v1/governance/meetings/${meetingId}/${path}`, init);
}

export function getMeetingControls(meetingId: string) {
  return request<MeetingParticipantControl[]>(meetingId, "controls");
}

export function getMeetingParticipants(meetingId: string) {
  return request<MeetingParticipant[]>(meetingId, "participants");
}

export function setSelfMeetingControl(meetingId: string, input: Record<string, boolean>) {
  return request(meetingId, "controls/self", { method: "POST", body: JSON.stringify(input) });
}

export function moderateMeetingParticipant(meetingId: string, userId: string, input: Record<string, boolean>) {
  return request(meetingId, `controls/${userId}`, { method: "POST", body: JSON.stringify(input) });
}

export type MeetingMediaJoinConfig = {
  mode: 'P2P' | 'SFU';
  provider: string;
  roomId: string;
  joinUrl?: string | null;
  token?: string | null;
  iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
};

export function getMeetingMediaJoinConfig(meetingId: string) {
  return request<MeetingMediaJoinConfig>(meetingId, "media/join-config");
}
