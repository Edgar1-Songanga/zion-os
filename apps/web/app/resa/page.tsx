import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ZionPoints from "@/components/resa/ZionPoints";
export default function RESA(){return <main className="pt-5"><ResaHero/><div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0"><ResaLiveFeed/></div><aside className="space-y-6"><ZionPoints/><CommunityCard/></aside></div></main>}