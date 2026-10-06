import Link from "next/link";

const items = [
  { title: "Bible Engine", eyebrow: "Scripture", href: "/bible-engine", description: "Pesquisa, estudo e descoberta estruturada das Escrituras.", state: "Motor existente · experiência disponível" },
  { title: "Oração", eyebrow: "Prayer", href: "/resa/prayer", description: "Pedidos, intercessão e acompanhamento de respostas em comunidade.", state: "Motor existente · experiência disponível" },
  { title: "Devoção", eyebrow: "Devotion", href: "/devotion", description: "Registo real de estudo, reflexão e oração associado à conta.", state: "API integrada · experiência disponível" },
  { title: "Crescimento espiritual", eyebrow: "Growth", href: "/spiritual-growth", description: "Linha factual de eventos espirituais e áreas de crescimento.", state: "API integrada · experiência disponível" },
  { title: "Escola Sabatina", eyebrow: "Study", href: "/sabbath-school", description: "Lições, referências bíblicas e continuidade de estudo.", state: "API integrada · conteúdo depende do repositório" },
  { title: "Fontes Adventistas", eyebrow: "Canon", href: "/adventist-canon", description: "Fontes com proveniência, autoridade e separação entre conteúdo e IA.", state: "API integrada · conteúdo depende do repositório" },
  { title: "Ministry", eyebrow: "Ministry", href: "/ministry", description: "Contexto e estruturas ministeriais institucionais.", state: "Motor existente · experiência disponível" },
  { title: "Spiritual Chat", eyebrow: "AI", href: "/spiritual-chat", description: "Assistência para estudo e crescimento espiritual, sem substituir as fontes.", state: "Experiência disponível" },
];

export default function SpiritualExperiencePage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[32px] bg-[#08152f] px-6 py-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.16)] sm:px-10 sm:py-11">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.05] blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#D4AF37]/[0.06] blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">ZION OS · Spiritual Layer</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Spiritual Experience</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Um ponto de entrada único para os motores espirituais do ZION. A experiência organiza os serviços existentes sem substituir os seus motores, fontes ou regras de domínio.
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_42px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-2 focus:ring-[#0C1A3D]/20">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.eyebrow}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition group-hover:bg-[#0C1A3D] group-hover:text-white">Abrir</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#0C1A3D]">{item.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{item.description}</p>
              <div className="mt-6 border-t border-slate-100 pt-4"><p className="text-[11px] font-medium leading-5 text-slate-400">{item.state}</p></div>
            </Link>
          ))}
        </section>

        <section className="mt-7 rounded-[26px] border border-slate-200 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex gap-4">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
            <div>
              <p className="text-sm font-semibold text-[#0C1A3D]">Integridade da experiência</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                O ZION não preenche lacunas com dados espirituais fictícios. Quando um motor tem API mas ainda não tem provider ou repositório de produção, essa condição é comunicada de forma explícita.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
