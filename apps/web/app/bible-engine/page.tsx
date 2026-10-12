import BibleSearch from "@/components/bible-engine/BibleSearch";
import KnowledgeCards from "@/components/bible-engine/KnowledgeCards";
import BibleQuiz from "@/components/bible-engine/quiz/BibleQuiz";

export default function BibleEngine() {
  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#0C1A3D] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-9 text-white shadow-[0_28px_90px_rgba(7,17,38,0.18)] sm:px-10 sm:py-12">
          <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-2 -top-14 h-52 w-52 rounded-full border border-[#D4AF37]/25" />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">ZION OS · Scripture & Knowledge</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Bible Engine</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Um espaço integrado para pesquisar as Escrituras, aprofundar o conhecimento bíblico e explorar os recursos da Igreja Adventista — com referências e fontes identificadas.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2">Pesquisa por livro, capítulo e versículo</span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2">Estudo estruturado</span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2">Desafio por níveis</span>
            </div>
          </div>
        </header>

        <BibleSearch />
        <KnowledgeCards />

        <section id="bible-challenge" className="scroll-mt-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Aprender · praticar · progredir</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Bible Challenge</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Avance por níveis, receba feedback após cada resposta e ganhe progresso registado quando conclui uma fase.</p>
            </div>
          </div>
          <BibleQuiz />
        </section>
      </div>
    </main>
  );
}
