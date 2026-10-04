import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ZionPoints from "@/components/resa/ZionPoints";
import ResaNavigation from "@/components/resa/core/ResaNavigation";
export default function RESA(){return <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1480px]"><ResaHero/><div className="mt-5"><ResaNavigation/></div><div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0"><ResaLiveFeed/></div><aside className="space-y-6"><ZionPoints/><CommunityCard/></aside></div></div></main>}