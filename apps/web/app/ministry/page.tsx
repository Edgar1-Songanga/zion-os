import MinistryDashboard from "@/components/ministry/MinistryDashboard";
import { ministryService } from "@/services/ministry-engine/provider";


export default async function MinistryPage() {

  const ministry =
    await ministryService.getMinistry(
      "ministry-youth-001"
    );


  if (!ministry) {
    return (
      <div>
        Ministério não encontrado.
      </div>
    );
  }


  return (
    <MinistryDashboard
      ministry={ministry}
    />
  );
}
