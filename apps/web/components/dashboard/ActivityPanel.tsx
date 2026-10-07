"use client";

const activities = [
  {
    title: "New organization registered",
    time: "2 minutes ago",
  },
  {
    title: "New RESA community created",
    time: "15 minutes ago",
  },
  {
    title: "Monthly institutional report submitted",
    time: "1 hour ago",
  },
  {
    title: "New spiritual testimony published",
    time: "3 hours ago",
  },
  {
    title: "New member connected",
    time: "Today",
  },
];

export default function ActivityPanel() {
  return (
    <div className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">
          Ecosystem Activity
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--zion-muted)]">
          Real-time movement across the ZION global network.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--zion-dark)]">
                {activity.title}
              </p>
              <p className="mt-1 text-xs text-[var(--zion-muted)]">
                {activity.time}
              </p>
            </div>

            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--zion-gold)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
