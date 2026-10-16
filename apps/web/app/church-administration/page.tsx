import ChurchDashboard from "@/components/organization/ChurchDashboard";
import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function ChurchAdministrationPage() {
  await requireAnyOrganizationRole(
    ["organization_owner", "organization_admin", "organization_leader"],
    "/church-administration",
  );
  return <ChurchDashboard />;
}
