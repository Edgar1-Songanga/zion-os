"use client";

const metrics = [
  {
    title: "Members",
    value: "12.5M",
    description: "Registered community members",
  },
  {
    title: "Organizations",
    value: "180K",
    description: "Churches and institutions",
  },
  {
    title: "RESA Users",
    value: "2.4M",
    description: "Connected communities",
  },
  {
    title: "Bible Studies",
    value: "850K",
    description: "Active spiritual journeys",
  },
];

export default function Metrics() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => (
        <div
          key={item.title}
          className="group relative overflow-hidden rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--zion-shadow-md)]"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--zion-gold)] opacity-80 transition-opacity group-hover:opacity-100" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">
              {item.title}
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--zion-dark)]">
              {item.value}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
