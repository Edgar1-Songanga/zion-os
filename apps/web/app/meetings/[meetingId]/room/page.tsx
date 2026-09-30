import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeetingRoom from "@/components/governance/MeetingRoom";

export const dynamic = "force-dynamic";

export default async function MeetingRoomPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/auth/sign-in");
  }

  const { meetingId } = await params;
  return <MeetingRoom meetingId={meetingId} />;
}
