import { redirect } from "next/navigation";
import ChurchDashboard from "@/components/organization/ChurchDashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChurchAdministrationPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/auth/sign-in?next=/church-administration");
  }

  return <ChurchDashboard />;
}
