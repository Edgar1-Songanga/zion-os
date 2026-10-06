type Props = { points: number; level: number; pointsToNextLevel: number };

export default function LevelProgress({ points, level, pointsToNextLevel }: Props) {
  const currentFloor = Math.pow(level - 1, 2) * 100;
  const nextFloor = Math.pow(level, 2) * 100;
  const progress = nextFloor === currentFloor ? 100 : Math.min(100, Math.max(0, ((points - currentFloor) / (nextFloor - currentFloor)) * 100));

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Progressão</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-[#0C1A3D]">Nível {level}</h2>
        <span className="text-xs font-medium text-slate-400">{Math.round(progress)}%</span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#D4AF37] transition-all" style={{ width: progress + "%" }} />
      </div>
      <p className="mt-4 text-sm text-slate-500">
        {pointsToNextLevel > 0 ? `${pointsToNextLevel.toLocaleString("pt-PT")} pontos até ao próximo nível.` : "Próximo nível disponível."}
      </p>
    </section>
  );
}
