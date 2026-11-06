import { redirect } from "next/navigation";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import DashboardContent from "@/components/dashboard/DashboardContent";
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
      <DashboardContent />
    </DashboardExperience>
  );
}
