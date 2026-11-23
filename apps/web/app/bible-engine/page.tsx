import Link from "next/link";
import BibleSearch from "@/components/bible-engine/BibleSearch";
import BibleBookExplorer from "@/components/bible-engine/BibleBookExplorer";
import KnowledgeCards from "@/components/bible-engine/KnowledgeCards";
import BibleQuiz from "@/components/bible-engine/quiz/BibleQuiz";
import BibleChallengeInvite from "@/components/bible-engine/BibleChallengeInvite";

const sections = [
  { href: "#bible-search", label: "Pesquisar" },
  { href: "#bible-books", label: "Livros bíblicos" },
  { href: "#bible-resources", label: "Conhecimento" },
  { href: "#bible-challenge", label: "Desafio" },
] as const;

export default function BibleEngine() {
  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#0C1A3D] sm:px-8 sm:py-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_24px_70px_rgba(7,17,38,0.15)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-2 -top-14 h-52 w-52 rounded-full border border-[#D4AF37]/20" />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">ZION OS · Scripture & Knowledge</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Bible Engine</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Pesquisa, estudo e aprendizagem bíblica num único espaço — com referências e fontes identificadas.</p>
            <nav aria-label="Navegação do Bible Engine" className="mt-7 flex flex-wrap gap-2">
              {sections.map((section, index) => <Link key={section.href} href={section.href} className={"inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " + (index === 0 ? "border-[#E2C477]/60 bg-[#E2C477] text-[#071126] hover:bg-[#F0D995]" : "border-white/15 bg-white/[0.06] text-slate-100 hover:bg-white/[0.12]")}>{section.label}<span aria-hidden="true" className="ml-2 opacity-60">↓</span></Link>)}
            </nav>
          </div>
        </header>
        <div className="space-y-7">
          <BibleSearch />
          <div id="bible-books" className="scroll-mt-6"><BibleBookExplorer /></div>
          <div id="bible-resources" className="scroll-mt-6"><KnowledgeCards /></div>
          <section id="bible-challenge" className="scroll-mt-6 space-y-5">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Aprender · praticar · progredir</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Bible Challenge</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Um percurso progressivo para testar conhecimentos, compreender as respostas e consolidar a memória bíblica.</p></div>
            <BibleChallengeInvite />
            <BibleQuiz />
          </section>
        </div>
      </div>
    </main>
  );
}
