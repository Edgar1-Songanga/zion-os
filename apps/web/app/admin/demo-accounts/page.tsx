import { requireGlobalAdmin } from "@/lib/auth/require-role";
import DemoAccountsProvisioner from "@/components/admin/DemoAccountsProvisioner";

export const dynamic = "force-dynamic";

export default async function DemoAccountsPage() {
  await requireGlobalAdmin("/admin/demo-accounts");
  return <DemoAccountsProvisioner />;
}
