import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  await requireAnyOrganizationRole(["organization_owner", "organization_admin", "payroll_manager"], "/payroll");
  return children;
}
