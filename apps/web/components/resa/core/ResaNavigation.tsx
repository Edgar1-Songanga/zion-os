"use client";

import { useEffect, useRef, useState } from "react";
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

const primaryNavigation = [
  ["Mural", "home", "/resa"],
  ["Explorar", "search", "/resa/explore"],
  ["Comunidades", "users", "/resa/communities"],
  ["Lives", "live", "/resa/live"],
  ["Mensagens", "message", "/resa/messages"],
] as const;

const secondaryNavigation = [
  ["Eventos", "calendar", "/resa/events"],
  ["Oração", "prayer", "/resa/prayer"],
  ["Stories", "story", "/resa/stories"],
  ["Creator Studio", "creator", "/resa/creator"],
] as const;

function profileName(profile: ProfilePreview | null) {
  return profile?.display_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Perfil";
}

function profileInitial(profile: ProfilePreview | null) {
  return profileName(profile).slice(0, 1).toUpperCase() || "Z";
}

export default function ResaNavigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProfilePreview | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    resaRequest<ProfilePreview>("/v1/identity/profile")
      .then((data) => { if (active) setProfile(data); })
      .catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (!moreRef.current?.contains(target)) setMoreOpen(false);
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const activeProfile = pathname === "/profile" || pathname.startsWith("/profile");
  const activeMore = secondaryNavigation.some(([, , href]) => pathname === href || pathname.startsWith(href));

  return (
    <header className="sticky top-2 z-50 mb-5">
      <div className="rounded-[24px] border border-white/80 bg-white/90 p-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <nav className="flex min-h-14 items-center gap-1" aria-label="Navegação RESA">
          <Link href="/resa" className="mr-1 flex shrink-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[#091735] transition hover:bg-slate-50" aria-label="RESA">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#091735] text-sm font-black tracking-tight text-white shadow-sm">R</span>
            <span className="hidden text-sm font-extrabold tracking-[0.08em] sm:block">RESA</span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
            {primaryNavigation.map(([name, icon, href]) => {
              const active = pathname === href || (href !== "/resa" && pathname.startsWith(href));
              return (
                <Link
                  key={name}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={"group flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition " +
                    (active ? "bg-[#091735] text-white shadow-[0_8px_24px_rgba(9,23,53,0.18)]" : "text-slate-600 hover:bg-slate-100/80 hover:text-[#091735]")}
                >
                  <ResaIcon name={icon} size={16} />
                  <span>{name}</span>
                </Link>
              );
            })}

            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => { setMoreOpen((v) => !v); setAccountOpen(false); }}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={"flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition " +
                  (activeMore || moreOpen ? "bg-slate-100 text-[#091735]" : "text-slate-600 hover:bg-slate-100/80 hover:text-[#091735]")}
              >
                <ResaIcon name="more" size={17} />
                <span>Mais</span>
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-60 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.16)]" role="menu">
                  <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Explorar mais</p>
                  {secondaryNavigation.map(([name, icon, href]) => (
                    <Link key={name} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#091735]" role="menuitem">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><ResaIcon name={icon} size={15} /></span>
                      <span>{name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link href="/resa/explore" aria-label="Pesquisar" title="Pesquisar" className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-[#091735]">
              <ResaIcon name="search" size={18} />
            </Link>
            <NotificationBell />

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => { setAccountOpen((v) => !v); setMoreOpen(false); }}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Abrir menu da conta"
                title="Conta e perfil"
                className={"group flex items-center gap-2 rounded-2xl border px-1.5 py-1.5 transition " +
                  (activeProfile || accountOpen ? "border-[#091735] bg-[#091735] text-white shadow-[0_8px_24px_rgba(9,23,53,0.16)]" : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white")}
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-extrabold text-[#091735] ring-2 ring-white shadow-sm">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profileInitial(profile)}
                </span>
                <span className="hidden max-w-[110px] truncate pr-1 text-xs font-semibold lg:block">{profileName(profile)}</span>
                <span className="hidden pr-1 text-[10px] opacity-60 sm:block">⌄</span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-72 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                  <div className="bg-[#091735] p-4 text-white">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold ring-1 ring-white/20">
                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profileInitial(profile)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{profileName(profile)}</p>
                        <p className="mt-0.5 text-xs text-slate-300">Identidade ZION</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link href="/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><ResaIcon name="user" size={15} /></span>
                      Perfil
                    </Link>
                    <Link href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><ResaIcon name="settings" size={15} /></span>
                      Conta e segurança
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <div className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-500">
                      <span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><ResaIcon name="globe" size={15} /></span>Idioma</span>
                      <span className="text-xs font-semibold text-slate-400">Português</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="flex gap-1 overflow-x-auto px-1 pb-0.5 pt-1 md:hidden scrollbar-none">
          {primaryNavigation.map(([name, icon, href]) => {
            const active = pathname === href || (href !== "/resa" && pathname.startsWith(href));
            return (
              <Link key={name} href={href} aria-current={active ? "page" : undefined} className={"flex min-w-fit items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold " + (active ? "bg-[#091735] text-white" : "text-slate-500 hover:bg-slate-100")}>
                <ResaIcon name={icon} size={14} />{name}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className="flex min-w-fit items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">
            <ResaIcon name="more" size={14} />Mais
          </button>
        </div>
      </div>
    </header>
  );
}
