"use client";

import Link from "next/link";

const modules = [
  { name: "Dashboard", area: "Core", path: "/dashboard", status: "Available", description: "ZION command center and ecosystem overview." },
  { name: "RESA", area: "Core", path: "/resa", status: "Available", description: "Communities, feed, events, messaging and spiritual interaction." },
  { name: "Administration", area: "Organization", path: "/admin", status: "Available", description: "Organizations, units, ministries and administration data." },
  { name: "Youth Ministry", area: "Ministry", path: "/ministry", status: "Available", description: "Live ministry metrics, programs, leaders and philosophy." },
  { name: "Bible Engine", area: "Spiritual", path: "/bible-engine", status: "Available", description: "Bible search and reference experience." },
  { name: "Spiritual Chat", area: "Spiritual", path: "/spiritual-chat", status: "Available", description: "Spiritual assistant and contextual guidance." },
  { name: "Profile", area: "Identity", path: "/profile", status: "Available", description: "Personal identity and profile management." },
  { name: "Finance", area: "Organization", path: "/finance", status: "Available", description: "Finance workspace entry point." },
  { name: "Governance", area: "Organization", path: "/admin", status: "API connected", description: "Councils, meetings, agendas, motions, votes and minutes." },
  { name: "Organizations", area: "Organization", path: "/admin", status: "API connected", description: "Organizations, units, memberships, roles and permissions." },
  { name: "Notifications", area: "Platform", path: "/notifications", status: "API connected", description: "Persistent notification and preference operations." },
  { name: "Member Services", area: "Membership", path: "/member-services", status: "API connected", description: "Transfers, recommendation letters, child dedications, baptism and pastoral service requests." },
  { name: "Secretary Office", area: "Administration", path: "/secretary", status: "API connected", description: "Organization-scoped review, approval, rejection and completion of member service requests." },
  { name: "Platform Runtime", area: "Platform", path: "/modules", status: "API connected", description: "Health, search, analytics, events and jobs foundation." },
  { name: "Media and Meetings", area: "Platform", path: "/meetings/demo/room", status: "Configuration required", description: "Meeting rooms and media transport require provider configuration." },
  { name: "Spiritual Growth", area: "Spiritual", path: "/spiritual-chat", status: "Partial", description: "Devotion, prayer and growth interfaces are available; persistence providers are being connected." },
];

export default function ModulesPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-[#0C1A3D] p-8 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">ZION OS</p>
          <h1 className="mt-3 text-4xl font-bold">Module Directory</h1>
          <p className="mt-3 max-w-3xl text-white/70">Every platform capability is listed here with its current frontend and API availability.</p>
        </header>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article key={module.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{module.area}</p>
                  <h2 className="mt-2 text-xl font-bold text-[#0C1A3D]">{module.name}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${module.status === "Available" ? "bg-emerald-100 text-emerald-700" : module.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{module.status}</span>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{module.description}</p>
              <Link href={module.path} className="mt-6 inline-flex font-semibold text-[#D4AF37] hover:underline">Open module →</Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
