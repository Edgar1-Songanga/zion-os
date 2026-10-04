import Link from "next/link";
import ResaIcon from "./core/ResaIcon";

export default function ResaHero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#08152f] px-5 py-6 text-white shadow-[0_20px_60px_rgba(8,21,47,0.16)] sm:px-7 sm:py-7">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="absolute -bottom-20 left-1/2 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
              <ResaIcon name="sparkles" size={19} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rede social global</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">RESA</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
            Um espaço global para pessoas, comunidades, fé, serviço e experiências que merecem ser partilhadas.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/resa/explore"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] transition hover:-translate-y-0.5"
          >
            <ResaIcon name="search" size={15} />
            Explorar
          </Link>
          <Link
            href="/resa/communities"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ResaIcon name="users" size={15} />
            Comunidades
          </Link>
        </div>
      </div>
    </section>
  );
}
