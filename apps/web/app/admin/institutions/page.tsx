import { redirect } from "next/navigation";
import InstitutionalHierarchyManager from "@/components/admin/InstitutionalHierarchyManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InstitutionalOrganizationsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const appMetadata = claims?.app_metadata as Record<string, unknown> | undefined;

  if (!claims?.sub) redirect("/auth/sign-in?next=/admin/institutions");
  if (appMetadata?.zion_global_role !== "global_admin" || appMetadata?.zion_verified !== true) {
    redirect("/dashboard?access=denied");
  }

  return <InstitutionalHierarchyManager />;
}
