"use client";

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  label,
  value,
  description,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--zion-shadow-md)] ${className}`}
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[var(--zion-sky)]/10 blur-3xl transition-transform duration-500 group-hover:scale-125" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        {icon && <div className="mb-4 text-2xl text-[var(--zion-primary)]">{icon}</div>}

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">
          {label}
        </p>

        <h3 className="mt-3 text-4xl font-bold tracking-tight text-[var(--zion-dark)]">
          {value}
        </h3>

        {description && (
          <p className="mt-3 text-sm leading-6 text-[var(--zion-muted)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
