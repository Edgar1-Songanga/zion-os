type Props = { points: number; level: number };

export default function ScoreCard({ points, level }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-[#0C1A3D] p-8 text-white shadow-[0_24px_70px_rgba(12,26,61,0.18)]">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">ZION Points</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[#D4AF37]">{points.toLocaleString("pt-PT")}</h1>
        <p className="mt-4 text-sm text-slate-200">Nível {level} · progresso espiritual baseado em atividade real</p>
      </div>
    </section>
  );
}
