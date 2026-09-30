import { createClient } from "@/lib/supabase/client";

export type MeetingParticipantControl = { meeting_id: string; user_id: string; mic_muted: boolean; camera_enabled: boolean; screen_sharing: boolean; hand_raised: boolean; removed: boolean; };\n\nexport type MeetingParticipant = {
  id: string;
  user_id: string;
  participant_role: string;
  status: string;
};

async function request<T>(meetingId: string, path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Authentication is required");
  const apiBase = process.env.NEXT_PUBLIC_ZION_API_URL;
  if (!apiBase) throw new Error("NEXT_PUBLIC_ZION_API_URL is not configured");

  const response = await fetch(`${apiBase}/v1/governance/meetings/${meetingId}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error((await response.text()) || "Meeting request failed");
  return response.json() as Promise<T>;
}

export function getMeetingControls(meetingId: string) {\n  return request<MeetingParticipantControl[]>(meetingId, "controls");\n}\n\nexport function getMeetingParticipants(meetingId: string) {
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
  iceServers?: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
};

export function getMeetingMediaJoinConfig(meetingId: string) {
  return request<MeetingMediaJoinConfig>(meetingId, "media/join-config");
}
