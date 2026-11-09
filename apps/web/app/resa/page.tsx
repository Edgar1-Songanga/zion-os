import ResaHero from "@/components/resa/ResaHero";
import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ResaAccountCard from "@/components/resa/ResaAccountCard";
import ResaMinistryHub from "@/components/resa/ResaMinistryHub";
import Link from "next/link";
import ResaIcon from "@/components/resa/core/ResaIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RESA() {
  return (
    <main className="min-h-screen pb-10 pt-2 sm:pt-4">
      <ResaHero />
      <ResaMinistryHub />
      <nav aria-label="Comunicação RESA" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/resa/meetings" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white"><ResaIcon name="users" size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#0C1A3D]">Reuniões de grupo</span>
            <span className="mt-1 block text-xs text-slate-500">Reuniões, convites, chat e partilha de ecrã</span>
          </span>
          <span aria-hidden="true" className="text-lg text-slate-400 transition group-hover:translate-x-1">→</span>
        </Link>
        <Link href="/resa/live" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white"><ResaIcon name="live" size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#0C1A3D]">Lives</span>
            <span className="mt-1 block text-xs text-slate-500">Transmissões ao vivo e participação pública</span>
          </span>
          <span aria-hidden="true" className="text-lg text-slate-400 transition group-hover:translate-x-1">→</span>
        </Link>
      </nav>
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
