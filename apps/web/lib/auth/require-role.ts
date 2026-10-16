import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Claims = Record<string, unknown> & { sub?: string; app_metadata?: Record<string, unknown> };

export async function requireGlobalAdmin(nextPath = "/admin") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Claims | undefined;
  if (!claims?.sub) redirect("/auth/sign-in?next=" + encodeURIComponent(nextPath));
  if (claims.app_metadata?.zion_global_role !== "global_admin") {
    redirect("/dashboard?access=denied");
  }
}

export async function requireAnyOrganizationRole(allowedRoles: readonly string[], nextPath: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Claims | undefined;
  if (!claims?.sub) redirect("/auth/sign-in?next=" + encodeURIComponent(nextPath));
  if (claims.app_metadata?.zion_global_role === "global_admin") return;

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role_id")
    .eq("user_id", claims.sub)
    .eq("status", "ACTIVE");

  if (membershipError || !memberships?.length) redirect("/dashboard?access=denied");
  const roleIds = [...new Set(memberships.map((membership) => membership.role_id).filter(Boolean))];
  if (!roleIds.length) redirect("/dashboard?access=denied");

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("key")
    .in("id", roleIds);

  if (rolesError || !roles?.some((role) => allowedRoles.includes(role.key))) {
    redirect("/dashboard?access=denied");
  }
}
