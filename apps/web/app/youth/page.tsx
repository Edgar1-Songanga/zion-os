import YouthMinistryHub from "@/components/youth/dashboard/YouthMinistryHub";
import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export default async function YouthPage() {
  await requireAnyOrganizationRole(
    ["organization_owner", "organization_admin", "organization_leader", "pastor", "youth_director", "ministry_leader", "department_leader"],
    "/youth",
  );
  return <YouthMinistryHub />;
}
