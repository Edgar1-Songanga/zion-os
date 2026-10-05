"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ResaIcon from "./ResaIcon";

const navigation = [
  ["Mural", "home", "/resa"],
  ["Explorar", "search", "/resa/explore"],
  ["Comunidades", "users", "/resa/communities"],
  ["Lives", "live", "/resa/live"],
  ["Eventos", "calendar", "/resa/events"],
  ["Oração", "prayer", "/resa/prayer"],
  ["Mensagens", "message", "/resa/messages"],
  ["Stories", "story", "/resa/stories"],
  ["Creator Studio", "creator", "/resa/creator"],
] as const;

export default function ResaNavigation() {
  const pathname = usePathname();

  return (
    <div className="sticky top-3 z-30 mb-5 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="Navegação RESA">
        {navigation.map(([name, icon, href]) => {
          const active = pathname === href || (href !== "/resa" && pathname.startsWith(href));
          return (
            <Link
              key={name}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "group flex min-w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:px-3.5 " +
                (active
                  ? "bg-[#0C1A3D] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0C1A3D]")
              }
            >
              <span className={"flex h-7 w-7 items-center justify-center rounded-lg " + (active ? "bg-white/10" : "bg-slate-100")}>
                <ResaIcon name={icon} size={16} />
              </span>
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
