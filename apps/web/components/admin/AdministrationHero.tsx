import Link from "next/link";

const priorities = [
  { number: "01", title: "Estrutura institucional", description: "Organizações, departamentos e ministérios ligados aos registos reais.", href: "#organization-overview", action: "Ver organizações" },
  { number: "02", title: "Membros e governação", description: "Base para controlo de adesões, responsabilidades e histórico auditável.", href: "#membership-governance", action: "Ver administração" },
  { number: "03", title: "Relatórios operacionais", description: "Compilação de indicadores a partir dos dados registados no sistema.", href: "/reports", action: "Abrir relatórios" },
];

export default function AdministrationHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] p-6 text-white shadow-[0_28px_90px_rgba(7,17,38,0.16)] sm:p-10">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-80 w-80 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -right-2 -top-10 h-56 w-56 rounded-full border border-[#D4AF37]/25" />
      <div className="relative max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#E2C477]">ZION OS · Governance & Operations</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Centro de administração</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Uma base operacional para gerir a estrutura da Igreja, acompanhar ministérios e consolidar informação com rastreabilidade. Os indicadores devem refletir os registos reais, não estimativas decorativas.
        </p>
      </div>
      <div className="relative mt-8 grid gap-3 md:grid-cols-3">
        {priorities.map((item) => (
          <article key={item.number} className="flex min-h-[180px] flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-[#E2C477]">{item.number} / OPERAÇÕES</span>
            <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
            <Link href={item.href} className="mt-auto inline-flex items-center gap-2 pt-5 text-xs font-semibold text-white hover:text-[#E2C477]">{item.action} <span aria-hidden="true">→</span></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
