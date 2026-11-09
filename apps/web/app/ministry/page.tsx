import MinistryLivePage from "@/components/ministry/MinistryLivePage";
import { requireAnyOrganizationRole } from "@/lib/auth/require-role";

export default async function MinistryPage() {
  await requireAnyOrganizationRole(
    ["organization_owner", "organization_admin", "organization_leader", "pastor", "ministry_leader", "department_leader", "stewardship_manager"],
    "/ministry",
  );
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <MinistryLivePage />
      </div>
    </main>
  );
}
