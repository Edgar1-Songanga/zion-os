import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireAnyOrganizationRole(
    ["organization_owner", "organization_admin", "finance_manager", "hr_manager", "payroll_manager", "secretary"],
    "/reports",
  );
  return children;
}
