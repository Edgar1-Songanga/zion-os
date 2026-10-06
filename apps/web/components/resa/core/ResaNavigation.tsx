"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ResaIcon from "./ResaIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import { resaRequest } from "@/lib/resa/api";

type ProfilePreview = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

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

function profileName(profile: ProfilePreview | null) {
  if (!profile) return "Perfil";
  return profile.display_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    "Perfil";
}

function profileInitial(profile: ProfilePreview | null) {
  return profileName(profile).slice(0, 1).toUpperCase() || "Z";
}

export default function ResaNavigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProfilePreview | null>(null);

  useEffect(() => {
    let active = true;
    resaRequest<ProfilePreview>("/v1/identity/profile")
      .then((data) => { if (active) setProfile(data); })
      .catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, []);

  const activeProfile = pathname === "/profile" || pathname.startsWith("/profile");

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

          <div className="ml-auto flex shrink-0 items-center gap-1 px-1">
            <NotificationBell />
            <Link
              href="/profile"
              aria-current={activeProfile ? "page" : undefined}
              aria-label="Abrir o meu perfil"
              title="Meu perfil"
              className={
                "group flex items-center gap-2 rounded-2xl border px-2 py-1.5 transition sm:px-2.5 " +
                (activeProfile
                  ? "border-[#091735] bg-[#091735] text-white"
                  : "border-slate-200 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50")
              }
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-[#091735] ring-1 ring-slate-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  profileInitial(profile)
                )}
              </span>
              <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:block">{profileName(profile)}</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
