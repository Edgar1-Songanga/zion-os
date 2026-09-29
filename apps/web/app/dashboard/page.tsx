import { redirect } from "next/navigation";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import DashboardHero from "@/components/dashboard/DashboardHero";
import Metrics from "@/components/dashboard/Metrics";
import ActivityPanel from "@/components/dashboard/ActivityPanel";
import ReputationCard from "@/components/dashboard/ReputationCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/auth/sign-in?next=/dashboard");
  }

  return (
    <DashboardExperience>
      <div className="space-y-8">
        <DashboardHero />
        <Metrics />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <ActivityPanel />
          <ReputationCard />
        </div>
      </div>
    </DashboardExperience>
  );
}
