import { redirect } from "next/navigation";
import AdminExperience from "@/components/admin/AdminExperience";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const appMetadata = claims?.app_metadata as Record<string, unknown> | undefined;

  if (!claims?.sub) {
    redirect("/auth/sign-in?next=/admin");
  }

  if (appMetadata?.zion_global_role !== "global_admin") {
    redirect("/dashboard?access=denied");
  }

  return <AdminExperience />;
}
