import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function HumanResourcesLayout({ children }: { children: React.ReactNode }) {
  await requireAnyOrganizationRole(["organization_owner", "organization_admin", "hr_manager"], "/hr");
  return children;
}
