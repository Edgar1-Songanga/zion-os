import ResaLiveFeed from "@/components/resa/ResaLiveFeed";
import CommunityCard from "@/components/resa/CommunityCard";
import ResaMinistryHub from "@/components/resa/ResaMinistryHub";
import Link from "next/link";
import ResaIcon from "@/components/resa/core/ResaIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const destinations = [
  { href: "/resa/reels", label: "Reels", detail: "Vídeo curto", icon: "story" as const },
  { href: "/resa/communities", label: "Comunidades", detail: "Encontra pessoas", icon: "users" as const },
  { href: "/resa/live", label: "Ao vivo", detail: "Participa em direto", icon: "live" as const },
  { href: "/resa/events", label: "Eventos", detail: "O que vem a seguir", icon: "calendar" as const },
];

export default function RESA() {
  return (
    <main className="mx-auto max-w-[1440px]">
      <section className="relative mb-6 overflow-hidden rounded-[30px] border border-[#dce5f0] bg-white shadow-[0_18px_55px_rgba(15,35,65,0.06)]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(87,145,221,0.13),transparent_34%),linear-gradient(115deg,#fff_0%,#f8fbff_62%,#eef4ff_100%)]" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              A rede está em movimento
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#091735] sm:text-4xl">A tua comunidade. <span className="text-sky-700">Em conexão.</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-[15px]">Descobre ideias, acompanha pessoas e participa em conversas que aproximam a comunidade.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            {destinations.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-white bg-white/85 p-3 shadow-[0_5px_18px_rgba(15,35,65,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4fb] text-[#12345a] transition group-hover:bg-[#10284a] group-hover:text-white"><ResaIcon name={item.icon} size={17} /></span>
                <span className="mt-2 block text-xs font-bold text-[#10213d]">{item.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{item.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0" aria-label="Mural RESA">
          <ResaLiveFeed />
        </section>
        <aside className="space-y-5 xl:sticky xl:top-24" aria-label="Descobrir no RESA">
          <CommunityCard />
          <section className="overflow-hidden rounded-[26px] border border-[#dce5f0] bg-[#0b1c39] p-5 text-white shadow-[0_16px_40px_rgba(9,23,53,0.12)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Espaço de fé</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">Crescer em comunidade</h2>
            <p className="mt-1 text-sm leading-5 text-slate-300">Estudo bíblico, serviço e iniciativas da igreja, ligados ao ZION.</p>
            <Link href="/sabbath-school" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#0b1c39] transition hover:bg-sky-50">Abrir Escola Sabatina <span aria-hidden="true">→</span></Link>
            <Link href="/youth" className="ml-2 inline-flex items-center rounded-xl border border-white/20 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">Ministério Jovem</Link>
          </section>
        </aside>
      </div>

      <div className="mt-8">
        <ResaMinistryHub />
      </div>
    </main>
  );
}
