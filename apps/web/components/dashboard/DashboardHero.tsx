"use client";

export default function DashboardHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--zion-primary)] p-8 shadow-[var(--zion-shadow-lg)] sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.28),transparent_42%)]" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,transparent,rgba(94,143,184,0.18))]" />

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
          ZION OS COMMAND CENTER
        </p>

        <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
          A Global Digital Ecosystem
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
          Connecting churches, ministries, communities and people through one intelligent institutional platform.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          {["Global Community", "Spiritual Growth", "Digital Mission"].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
