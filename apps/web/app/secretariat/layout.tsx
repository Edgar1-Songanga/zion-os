import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function SecretariatLayout({ children }: { children: React.ReactNode }) {
  await requireAnyOrganizationRole(["organization_owner", "organization_admin", "secretary"], "/secretariat");
  return children;
}
