import Link from "next/link";

const resources = [
  {
    number: "01",
    title: "Bible Library",
    description: "Procure passagens por livro, capítulo e versículo, com a tradução identificada.",
    href: "#bible-search",
    action: "Pesquisar Escrituras",
    accent: "from-[#D7B45A]/20 to-transparent",
  },
  {
    number: "02",
    title: "28 Fundamental Beliefs",
    description: "Explore as crenças fundamentais adventistas e aprofunde cada tema.",
    href: "/adventist-canon",
    action: "Explorar crenças",
    accent: "from-[#7CA7D8]/20 to-transparent",
  },
  {
    number: "03",
    title: "Church Manual",
    description: "Consulte os recursos institucionais e princípios de organização da Igreja.",
    href: "/adventist-canon",
    action: "Consultar fontes",
    accent: "from-[#8CB8A1]/20 to-transparent",
  },
  {
    number: "04",
    title: "Bible Studies",
    description: "Continue o estudo de forma estruturada através de lições e referências.",
    href: "/sabbath-school",
    action: "Abrir estudos",
    accent: "from-[#B2A0D8]/20 to-transparent",
  },
];

export default function KnowledgeCards() {
  return (
    <section aria-labelledby="knowledge-resources-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Biblioteca de conhecimento</p>
          <h2 id="knowledge-resources-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D]">Explore por área</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-500">Recursos organizados para pesquisa, estudo e consulta institucional.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <article key={resource.number} className="group relative flex min-h-[235px] flex-col overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#C8A24A]/50 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:p-6">
            <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${resource.accent}`} />
            <div className="relative flex items-center justify-between">
              <span className="text-xs font-semibold tracking-[0.18em] text-[#9B7A34]">{resource.number}</span>
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-[#0C1A3D] transition group-hover:border-[#C8A24A]/50">↗</span>
            </div>
            <div className="relative mt-7">
              <h3 className="text-lg font-semibold tracking-tight text-[#0C1A3D]">{resource.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{resource.description}</p>
            </div>
            <Link href={resource.href} className="relative mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#0C1A3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8A24A]">
              {resource.action}<span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
