import { resaRequest } from "@/lib/resa/api";

export type MeetingIceConfig = {
  transport: "P2P_STUN_ONLY" | "P2P_TURN";
  provider: string;
  iceServers: RTCIceServer[];
};

export function getMeetingIceConfig(meetingId: string): Promise<MeetingIceConfig> {
  return resaRequest<MeetingIceConfig>(
    `/v1/governance/meetings/${meetingId}/media/ice-config`,
  );
}
