"use client";

interface Badge {
  name: string;
  type: string;
}

const badges: Badge[] = [
  {
    name: "Community Builder",
    type: "community",
  },
  {
    name: "Bible Explorer",
    type: "spiritual",
  },
  {
    name: "Global Connector",
    type: "global",
  },
];

export default function ReputationCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
      <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[var(--zion-warm)]/10 blur-3xl" />

      <div className="relative z-10">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">
          ZION Reputation
        </h2>

        <p className="mt-1.5 text-sm leading-6 text-[var(--zion-muted)]">
          Community impact and spiritual contribution
        </p>

        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">
            Global Impact Points
          </p>

          <h3 className="mt-2 text-5xl font-bold tracking-tight text-[var(--zion-primary)]">
            84,500
          </h3>

          <div className="mt-5">
            <div className="flex justify-between text-xs font-medium text-[var(--zion-muted)]">
              <span>Level 08</span>
              <span>80%</span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--zion-light)]">
              <div className="h-full w-[80%] rounded-full bg-[var(--zion-gold)]" />
            </div>
          </div>

          <div className="mt-7 space-y-2">
            {badges.map((badge) => (
              <div
                key={badge.type}
                className="flex items-center gap-3 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] px-4 py-3"
              >
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--zion-gold)]" />

                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--zion-dark)]">
                    {badge.name}
                  </p>
                  <p className="text-xs text-[var(--zion-muted)]">
                    Verified contribution
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
