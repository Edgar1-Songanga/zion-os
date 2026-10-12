"use client";

import { useMemo, useState } from "react";
import { bibleQuestions, type BibleChallengeQuestion } from "@/data/bible/questions";

type Testament = "all" | "old" | "new";

type BibleBook = {
  name: string;
  testament: "old" | "new";
  aliases?: string[];
};

const BOOKS: BibleBook[] = [
  { name: "Génesis", testament: "old" }, { name: "Êxodo", testament: "old" },
  { name: "Levítico", testament: "old" }, { name: "Números", testament: "old" },
  { name: "Deuteronómio", testament: "old" }, { name: "Josué", testament: "old" },
  { name: "Juízes", testament: "old" }, { name: "Rute", testament: "old" },
  { name: "1 Samuel", testament: "old" }, { name: "2 Samuel", testament: "old" },
  { name: "1 Reis", testament: "old" }, { name: "2 Reis", testament: "old" },
  { name: "1 Crónicas", testament: "old" }, { name: "2 Crónicas", testament: "old" },
  { name: "Esdras", testament: "old" }, { name: "Neemias", testament: "old" },
  { name: "Ester", testament: "old" }, { name: "Job", testament: "old" },
  { name: "Salmos", testament: "old", aliases: ["Salmo"] }, { name: "Provérbios", testament: "old" },
  { name: "Eclesiastes", testament: "old" }, { name: "Cântico dos Cânticos", testament: "old", aliases: ["Cantares"] },
  { name: "Isaías", testament: "old" }, { name: "Jeremias", testament: "old" },
  { name: "Lamentações", testament: "old" }, { name: "Ezequiel", testament: "old" },
  { name: "Daniel", testament: "old" }, { name: "Oseias", testament: "old", aliases: ["Oséias"] },
  { name: "Joel", testament: "old" }, { name: "Amós", testament: "old" },
  { name: "Obadias", testament: "old" }, { name: "Jonas", testament: "old" },
  { name: "Miqueias", testament: "old" }, { name: "Naum", testament: "old" },
  { name: "Habacuque", testament: "old" }, { name: "Sofonias", testament: "old" },
  { name: "Ageu", testament: "old" }, { name: "Zacarias", testament: "old" },
  { name: "Malaquias", testament: "old" },
  { name: "Mateus", testament: "new" }, { name: "Marcos", testament: "new" },
  { name: "Lucas", testament: "new" }, { name: "João", testament: "new" },
  { name: "Atos", testament: "new", aliases: ["Atos dos Apóstolos"] },
  { name: "Romanos", testament: "new" }, { name: "1 Coríntios", testament: "new" },
  { name: "2 Coríntios", testament: "new" }, { name: "Gálatas", testament: "new" },
  { name: "Efésios", testament: "new" }, { name: "Filipenses", testament: "new" },
  { name: "Colossenses", testament: "new" }, { name: "1 Tessalonicenses", testament: "new" },
  { name: "2 Tessalonicenses", testament: "new" }, { name: "1 Timóteo", testament: "new" },
  { name: "2 Timóteo", testament: "new" }, { name: "Tito", testament: "new" },
  { name: "Filemom", testament: "new", aliases: ["Filémon"] }, { name: "Hebreus", testament: "new" },
  { name: "Tiago", testament: "new" }, { name: "1 Pedro", testament: "new" },
  { name: "2 Pedro", testament: "new" }, { name: "1 João", testament: "new" },
  { name: "2 João", testament: "new" }, { name: "3 João", testament: "new" },
  { name: "Judas", testament: "new" }, { name: "Apocalipse", testament: "new" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT").replace(/[^a-z0-9]+/g, " ").trim();
}

const MATCHABLE_BOOKS = [...BOOKS]
  .flatMap((book) => [book.name, ...(book.aliases ?? [])].map((alias) => ({ book, alias: normalize(alias) })))
  .sort((a, b) => b.alias.length - a.alias.length);

function bookForReference(reference: string) {
  const normalized = normalize(reference);
  return MATCHABLE_BOOKS.find(({ alias }) => normalized === alias || normalized.startsWith(alias + " "))?.book.name ?? null;
}

function bookDescription(book: BibleBook) {
  if (book.testament === "old") {
    return "Explore a história, a poesia, a sabedoria e as mensagens proféticas das Escrituras hebraicas.";
  }
  return "Descubra a vida de Jesus, a igreja primitiva, as cartas apostólicas e a esperança cristã.";
}

export default function BibleBookExplorer() {
  const [testament, setTestament] = useState<Testament>("all");
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);

  const questionsByBook = useMemo(() => {
    const grouped = new Map<string, BibleChallengeQuestion[]>();
    for (const question of bibleQuestions) {
      const book = bookForReference(question.reference);
      if (!book) continue;
      const current = grouped.get(book) ?? [];
      current.push(question);
      grouped.set(book, current);
    }
    return grouped;
  }, []);

  const filteredBooks = useMemo(() => {
    const term = normalize(search);
    return BOOKS.filter((book) => {
      const matchesTestament = testament === "all" || book.testament === testament;
      const matchesSearch = !term || normalize(book.name).includes(term);
      return matchesTestament && matchesSearch;
    });
  }, [search, testament]);

  const selected = BOOKS.find((book) => book.name === selectedBook) ?? null;
  const selectedQuestions = selectedBook ? questionsByBook.get(selectedBook) ?? [] : [];
  const coveredBooks = BOOKS.filter((book) => (questionsByBook.get(book.name)?.length ?? 0) > 0).length;

  return (
    <section aria-labelledby="bible-books-title" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <header className="relative isolate overflow-hidden bg-[#071126] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div aria-hidden="true" className="absolute -right-8 -top-20 h-52 w-52 rounded-full border border-[#D4AF37]/25" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#E2C477]">Uma jornada pelas Escrituras</p>
            <h2 id="bible-books-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Biblioteca dos 66 livros</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Escolhe um livro, explora as perguntas já disponíveis e revê as respostas com as suas referências bíblicas.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Livros</p>
              <p className="mt-1 text-2xl font-semibold text-[#E2C477]">66</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Com perguntas</p>
              <p className="mt-1 text-2xl font-semibold">{coveredBooks}<span className="text-sm font-normal text-slate-400">/66</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Pesquisar livro bíblico</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar um livro bíblico…" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-[#C8A24A] focus:bg-white focus:ring-4 focus:ring-[#C8A24A]/10" />
          </label>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Filtrar testamento">
            {([{ id: "all", label: "Todos" }, { id: "old", label: "Antigo" }, { id: "new", label: "Novo" }] as const).map((item) => (
              <button key={item.id} type="button" onClick={() => setTestament(item.id)} aria-pressed={testament === item.id} className={"rounded-lg px-3 py-2 text-xs font-semibold transition " + (testament === item.id ? "bg-[#0C1A3D] text-white shadow-sm" : "text-slate-500 hover:text-slate-900")}>{item.label}</button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="mt-6">
            <button type="button" onClick={() => { setSelectedBook(null); setRevealedAnswers([]); }} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B6F16] hover:text-[#0C1A3D]">← Voltar aos livros</button>
            <div className="mt-4 rounded-2xl border border-[#D4AF37]/25 bg-[#FBF8F0] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B6F16]">{selected.testament === "old" ? "Antigo Testamento" : "Novo Testamento"}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{selected.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{bookDescription(selected)}</p>
                </div>
                <span className="rounded-full border border-[#D4AF37]/30 bg-white px-3 py-2 text-xs font-semibold text-[#8B6F16]">{selectedQuestions.length} {selectedQuestions.length === 1 ? "pergunta" : "perguntas"} nesta edição</span>
              </div>
            </div>

            {selectedQuestions.length ? (
              <div className="mt-4 space-y-3">
                {selectedQuestions.map((question) => {
                  const revealed = revealedAnswers.includes(question.id);
                  return (
                    <article key={question.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        <span>Nível {question.level}</span><span aria-hidden="true">·</span><span>{question.reference}</span>
                      </div>
                      <h4 className="mt-3 text-base font-semibold leading-7 text-[#0C1A3D]">{question.question}</h4>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {question.options.map((option) => <li key={option} className={"rounded-lg border px-3 py-2 text-sm " + (revealed && option === question.answer ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-900" : "border-slate-100 bg-slate-50 text-slate-600")}>{option}</li>)}
                      </ul>
                      {revealed && <div className="mt-3 rounded-xl bg-[#F5F7FA] p-4"><p className="text-sm font-semibold text-[#0C1A3D]">Resposta: {question.answer}</p><p className="mt-1 text-sm leading-6 text-slate-600">{question.explanation}</p><p className="mt-2 text-xs font-semibold text-[#8B6F16]">Referência: {question.reference}</p></div>}
                      <button type="button" onClick={() => setRevealedAnswers((current) => revealed ? current.filter((id) => id !== question.id) : [...current, question.id])} aria-expanded={revealed} className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0C1A3D] transition hover:border-[#C8A24A]/60 hover:bg-[#FBF8F0]">{revealed ? "Ocultar resposta" : "Revelar resposta e explicação"}</button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <h4 className="font-semibold text-[#0C1A3D]">Este livro está no catálogo</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">A edição atual ainda não tem perguntas ligadas a este livro. O catálogo mostra a cobertura real para que possamos ampliá-la sem inventar conteúdo.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <p className="mb-3 text-xs text-slate-500">Seleciona um livro para consultar as perguntas e referências desta edição. Os livros sem perguntas continuam visíveis para mostrar a cobertura real.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((book, index) => {
                const count = questionsByBook.get(book.name)?.length ?? 0;
                return (
                  <button key={book.name} type="button" onClick={() => { setSelectedBook(book.name); setRevealedAnswers([]); }} className="group flex min-h-[104px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#C8A24A]/60 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0C1A3D] text-xs font-semibold tracking-wide text-[#E2C477]">{String(BOOKS.indexOf(book) + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[#0C1A3D]">{book.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{book.testament === "old" ? "Antigo Testamento" : "Novo Testamento"}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={"block text-lg font-semibold tabular-nums " + (count ? "text-[#8B6F16]" : "text-slate-300")}>{count}</span>
                      <span className="block text-[9px] uppercase tracking-[0.12em] text-slate-400">perguntas</span>
                    </span>
                    <span aria-hidden="true" className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#8B6F16]">→</span>
                  </button>
                );
              })}
            </div>
            {filteredBooks.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Não encontrámos esse livro. Experimenta outro nome.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
