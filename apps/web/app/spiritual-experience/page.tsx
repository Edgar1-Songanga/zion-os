import Link from "next/link";

const items = [
  { title: "Bible Engine", href: "/bible-engine", description: "Pesquisa bíblica e estudo das Escrituras.", state: "Disponível na experiência" },
  { title: "Oração", href: "/resa/prayer", description: "Pedidos de oração, intercessão e respostas.", state: "Disponível na experiência" },
  { title: "Escola Sabatina", href: "/sabbath-school", description: "Lições, referências bíblicas e ciclos de estudo.", state: "API integrada; conteúdo depende do repositório" },
  { title: "Fontes Adventistas", href: "/adventist-canon", description: "Fontes canónicas com proveniência e idioma.", state: "API integrada; conteúdo depende do repositório" },
  { title: "Ministry", href: "/ministry", description: "Dados e contexto ministerial institucional.", state: "Disponível na experiência" },
  { title: "Spiritual Chat", href: "/spiritual-chat", description: "Assistente para estudo bíblico e crescimento espiritual.", state: "Disponível na experiência" },
];

export default function SpiritualExperiencePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[32px] bg-[#08152f] p-8 text-white shadow-[0_24px_80px_rgba(8,21,47,0.18)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">ZION OS · Spiritual Layer</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Spiritual Experience</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Um ponto de entrada único para os motores espirituais já existentes no ZION. Esta camada não substitui os motores: organiza e expõe aquilo que já está disponível.
          </p>
        </section>
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#0C1A3D]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">Abrir</span>
              </div>
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">{item.state}</p>
            </Link>
          ))}
        </section>
        <section className="mt-8 rounded-[28px] border border-amber-100 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">Integridade da experiência</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Não são apresentados dados espirituais fictícios. Quando um motor já possui API mas ainda não tem provider/repositório de produção configurado, a interface informa essa condição em vez de simular conteúdo.
          </p>
        </section>
      </div>
    </main>
  );
}
