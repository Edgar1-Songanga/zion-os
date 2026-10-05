import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ResaAccountCard from "@/components/resa/ResaAccountCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RESA() {
  return (
    <main className="min-h-screen pb-10 pt-2 sm:pt-4">
      <ResaHero />
      <div className="mt-7 grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0" aria-label="Mural RESA">
          <ResaLiveFeed />
        </section>
        <aside className="space-y-7 xl:sticky xl:top-24 xl:self-start" aria-label="Painel RESA">
          <ResaAccountCard />
          <CommunityCard />
        </aside>
      </div>
    </main>
  );
}
