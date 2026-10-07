export default function Finance() {
  return (
    <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">Finance Engine</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Finanças</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Contabilidade institucional, contas, lançamentos e integração controlada com Payroll.</p>
        </header>
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Payroll</h2><p className="mt-2 text-sm text-slate-500">Salários, deduções e contribuições patronais.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Plano de contas</h2><p className="mt-2 text-sm text-slate-500">Ativos, passivos, capital, receitas e despesas.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Livro diário</h2><p className="mt-2 text-sm text-slate-500">Lançamentos com validação de partidas dobradas.</p></article>
        </div>
      </div>
    </main>
  );
}
