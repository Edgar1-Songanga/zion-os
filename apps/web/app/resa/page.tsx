import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ResaAccountCard from "@/components/resa/ResaAccountCard";

export default function RESA() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] pb-10 pt-4 sm:pt-6">
      <ResaHero />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <ResaLiveFeed />
        </div>
        <aside className="space-y-6">
          <ResaAccountCard />
          <CommunityCard />
        </aside>
      </div>
    </main>
  );
}
