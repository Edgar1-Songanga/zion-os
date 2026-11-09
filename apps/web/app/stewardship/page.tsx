import { redirect } from "next/navigation";
import MinistryLivePage from "@/components/ministry/MinistryLivePage";
import StewardshipArea from "@/components/ministry/StewardshipArea";
import { createClient } from "@/lib/supabase/server";
import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function StewardshipPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; app_metadata?: Record<string, unknown> } | undefined;
  if (!claims?.sub) redirect("/auth/sign-in?next=/stewardship");

  const metadata = claims.app_metadata ?? {};
  if (metadata.zion_global_role === "global_admin" && metadata.zion_verified === true) {
    return <MinistryLivePage />;
  }

  await requireAnyOrganizationRole(["stewardship_manager"], "/stewardship");
  return <StewardshipArea />;
}
