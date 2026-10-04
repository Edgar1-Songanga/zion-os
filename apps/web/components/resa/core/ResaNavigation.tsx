"use client";

import Link from "next/link";

const navigation = [
  { name: "Mural", icon: "🏠", href: "/resa" },
  { name: "Explorar", icon: "🔎", href: "/resa/explore" },
  { name: "Comunidades", icon: "👥", href: "/resa/communities" },
  { name: "Lives", icon: "🔴", href: "/resa" },
  { name: "Eventos", icon: "📅", href: "/resa/events" },
  { name: "Oração", icon: "🙏", href: "/resa/prayer" },
  { name: "Mensagens", icon: "💬", href: "/resa/messages" },
  { name: "Stories", icon: "◉", href: "/resa/stories" },
  { name: "Creator Studio", icon: "✦", href: "/resa/creator" },
];

export default function ResaNavigation() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <nav className="flex flex-wrap gap-3">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href} className="rounded-full bg-slate-50 px-5 py-3 text-sm font-medium transition hover:bg-slate-100">
            <span>{item.icon}</span>{" "}{item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
