import { requireGlobalAdmin } from "@/lib/auth/require-role";
import VerificationReviewPanel from "@/components/profile/verification/VerificationReviewPanel";

export default async function VerificationReviewPage() {
  await requireGlobalAdmin("/admin/verification");
  return <VerificationReviewPanel />;
}
