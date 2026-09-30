import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type MeetingSignal =
  | { type: "join"; peerId: string }
  | { type: "leave"; peerId: string; targetPeerId?: string }
  | { type: "offer"; peerId: string; targetPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; peerId: string; targetPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; peerId: string; targetPeerId: string; candidate: RTCIceCandidateInit }
  | { type: "mute"; peerId: string; targetPeerId?: string; muted: boolean }
  | { type: "camera"; peerId: string; targetPeerId?: string; enabled: boolean }
  | { type: "screen-share"; peerId: string; targetPeerId?: string; enabled: boolean }
  | { type: "hand"; peerId: string; targetPeerId?: string; raised: boolean };

export type MeetingRealtime = {
  channel: RealtimeChannel;
  sendSignal: (signal: MeetingSignal) => Promise<void>;
  trackPresence: (state: Record<string, unknown>) => Promise<void>;
  unsubscribe: () => Promise<void>;
};

export async function createMeetingRealtime(meetingId: string): Promise<MeetingRealtime> {
  const supabase = createClient();
  const topic = `zion:meeting:${meetingId}`;
  const channel = supabase.channel(topic, { config: { private: true } });

  const status = await new Promise<string>((resolve, reject) => {
    channel.subscribe((nextStatus, error) => {
      if (nextStatus === "SUBSCRIBED") resolve(nextStatus);
      if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
        reject(error ?? new Error(`Meeting channel failed: ${nextStatus}`));
      }
    });
  });

  if (status !== "SUBSCRIBED") throw new Error("Meeting realtime channel was not subscribed");

  return {
    channel,
    async sendSignal(signal) {
      await channel.send({ type: "broadcast", event: "webrtc-signal", payload: signal });
    },
    async trackPresence(state) { await channel.track(state); },
    async unsubscribe() { await supabase.removeChannel(channel); },
  };
}

export function onMeetingSignal(channel: RealtimeChannel, handler: (signal: MeetingSignal) => void) {
  channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }) => {
    handler(payload as MeetingSignal);
  });
}
