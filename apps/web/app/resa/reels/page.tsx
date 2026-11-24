import ResaReels from "@/components/resa/ResaReels";
import ProductPageView from "@/components/analytics/ProductPageView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ReelsPage() {
  return <><ProductPageView product="resa" module="reels" page="resa_reels" /><ResaReels /></>;
}
