import { createClient } from "@/lib/supabase/client";

export type MeetingIceConfig = {
  transport: "P2P_STUN_ONLY" | "P2P_TURN";
  provider: string;
  iceServers: RTCIceServer[];
};

export async function getMeetingIceConfig(meetingId: string): Promise<MeetingIceConfig> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authentication is required");
  }

  const apiBase = process.env.NEXT_PUBLIC_ZION_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_ZION_API_URL is not configured");
  }

  const response = await fetch(
    `${apiBase}/v1/governance/meetings/${meetingId}/media/ice-config`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load meeting ICE configuration");
  }

  return response.json() as Promise<MeetingIceConfig>;
}
