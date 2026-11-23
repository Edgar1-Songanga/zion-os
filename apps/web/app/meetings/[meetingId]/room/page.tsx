import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeetingRoom from "@/components/governance/MeetingRoom";
import ProductPageView from "@/components/analytics/ProductPageView";

export const dynamic = "force-dynamic";

export default async function MeetingRoomPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/auth/sign-in");
  }

  const { meetingId } = await params;
  return <><ProductPageView product="zion_os" module="meetings" page="meeting_room" /><MeetingRoom meetingId={meetingId} /></>;
}
