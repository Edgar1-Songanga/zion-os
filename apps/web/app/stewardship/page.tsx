import StewardshipArea from "@/components/ministry/StewardshipArea";
import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function StewardshipPage() {
  await requireAnyOrganizationRole(
    ["organization_owner", "organization_admin", "pastor", "stewardship_manager"],
    "/stewardship",
  );
  return <StewardshipArea />;
}
