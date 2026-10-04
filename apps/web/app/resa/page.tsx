import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ZionPoints from "@/components/resa/ZionPoints";
import ResaNavigation from "@/components/resa/core/ResaNavigation";

export default function RESA() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <ResaHero />
      <div className="mt-6"><ResaNavigation /></div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2"><ResaLiveFeed /></div>
        <div className="space-y-8"><ZionPoints /><CommunityCard /></div>
      </div>
    </main>
  );
}
