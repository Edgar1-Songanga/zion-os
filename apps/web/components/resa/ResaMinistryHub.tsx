import Link from "next/link";

const destinations = [
  {
    eyebrow: "ESTUDO BÍBLICO",
    title: "Escola Sabatina",
    description: "Acompanha a lição semanal, consulta referências bíblicas e segue o plano de estudo diário.",
    href: "/sabbath-school",
    action: "Abrir estudo",
    mark: "01",
  },
  {
    eyebrow: "JUVENTUDE E MISSÃO",
    title: "Ministério Jovem",
    description: "Conhece os programas jovens, clubes, formação, serviço comunitário e atividades da igreja.",
    href: "/youth",
    action: "Explorar ministério",
    mark: "02",
  },
];

export default function ResaMinistryHub() {
  return (
    <section aria-labelledby="resa-ministry-heading" className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Vida da igreja</p>
          <h2 id="resa-ministry-heading" className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">Estudos e ministérios</h2>
          <p className="mt-1 text-sm text-slate-500">Conteúdos e iniciativas que a comunidade pode acompanhar no RESA.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Acesso comunitário</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {destinations.map((item) => (
          <article key={item.href} className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#C8A24A]/60 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
            <span aria-hidden="true" className="absolute right-5 top-3 text-5xl font-semibold tracking-tighter text-slate-100 transition group-hover:text-[#C8A24A]/15">{item.mark}</span>
            <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B7A34]">{item.eyebrow}</p>
            <h3 className="relative mt-3 text-xl font-semibold tracking-tight text-[#0C1A3D]">{item.title}</h3>
            <p className="relative mt-2 max-w-xl text-sm leading-6 text-slate-600">{item.description}</p>
            <Link href={item.href} className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172D59]">
              {item.action}<span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-3 px-1 text-xs leading-5 text-slate-500">
        A administração de classes, membros, professores e atividades continua reservada aos responsáveis autorizados no ZION.
      </p>
    </section>
  );
}
