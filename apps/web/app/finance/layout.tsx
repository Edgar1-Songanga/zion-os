import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAnyOrganizationRole(["organization_owner", "organization_admin", "finance_manager"], "/finance");
  return children;
}
