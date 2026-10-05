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
    <header className="sticky top-2 z-40 mb-5">
      <div className="rounded-[22px] border border-white/70 bg-white/80 p-1.5 shadow-[0_16px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="Navegação RESA">
          {navigation.map(([name, icon, href]) => {
            const active = pathname === href || (href !== "/resa" && pathname.startsWith(href));
            return (
              <Link
                key={name}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "group flex min-w-fit items-center gap-2 rounded-2xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-200 sm:px-3.5 sm:py-2.5 " +
                  (active
                    ? "bg-[#091735] text-white shadow-[0_8px_24px_rgba(9,23,53,0.20)]"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-[#091735]")
                }
              >
                <span className={"flex h-7 w-7 items-center justify-center rounded-xl transition " + (active ? "bg-white/10" : "bg-slate-100 group-hover:bg-white")}>
                  <ResaIcon name={icon} size={15} />
                </span>
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
