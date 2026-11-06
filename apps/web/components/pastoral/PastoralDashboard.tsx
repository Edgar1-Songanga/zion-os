"use client";

export default function PastoralDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ZION · Cuidado pastoral</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0C1A3D]">Painel Pastoral</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Acompanhamento espiritual da comunidade, visitas, pedidos de oração e planos de cuidado.
        </p>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="pastoral-data-title">
          <h2 id="pastoral-data-title" className="text-lg font-semibold text-[#0C1A3D]">Dados de acompanhamento</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Os indicadores serão apresentados quando estiverem ligados aos registos reais da igreja e às permissões do utilizador.
            Não apresentamos estimativas ou números de demonstração como se fossem atividade pastoral real.
          </p>
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="font-medium text-slate-700">Ainda não existem indicadores disponíveis neste painel.</p>
            <p className="mt-1 text-sm text-slate-500">Os registos de visitas, famílias acompanhadas e pedidos de oração serão agregados após a integração dos respetivos fluxos.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
