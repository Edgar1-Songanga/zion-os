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
  ["Reels", "story", "/resa/reels"],
  ["Comunidades", "users", "/resa/communities"],
  ["Lives", "live", "/resa/live"],
  ["Mensagens", "message", "/resa/messages"],
] as const;

const secondaryNavigation = [
  ["Stories", "story", "/resa/stories"],
  ["Eventos", "calendar", "/resa/events"],
  ["Guardados", "bookmark", "/resa/saved"],
  ["Oração", "prayer", "/resa/prayer"],
  ["Creator Studio", "creator", "/resa/creator"],
] as const;

function profileName(profile: ProfilePreview | null) {
  return profile?.display_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Perfil";
}

function Avatar({ profile, size = "h-9 w-9" }: { profile: ProfilePreview | null; size?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-xs font-extrabold text-[#10284a] ring-2 ring-white`}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profileName(profile).slice(0, 1).toUpperCase()}
    </span>
  );
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
    setMoreOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (!moreRef.current?.contains(target)) setMoreOpen(false);
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const isActive = (href: string) => pathname === href || (href !== "/resa" && pathname.startsWith(href));
  const activeMore = secondaryNavigation.some(([, , href]) => isActive(href));

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-slate-200/70 bg-white/90 px-3 py-2.5 backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 lg:ml-[88px]">
          <Link href="/resa" className="flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1" aria-label="RESA — Mural">
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#091735] text-sm font-black text-white shadow-[0_5px_16px_rgba(9,23,53,0.2)]">R</span>
            <span className="text-sm font-extrabold tracking-[0.12em] text-[#091735]">RESA</span>
            <span className="hidden rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-sky-800 sm:inline-flex">Comunidade</span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/resa/explore" aria-label="Pesquisar no RESA" title="Pesquisar" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#091735] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              <ResaIcon name="search" size={18} />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-50"><NotificationBell /></div>
            <div ref={accountRef} className="relative">
              <button type="button" onClick={() => { setAccountOpen((v) => !v); setMoreOpen(false); }} aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Abrir menu da conta" className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                <Avatar profile={profile} />
                <span className="hidden max-w-[130px] truncate pr-1 text-xs font-semibold text-slate-700 sm:block">{profileName(profile)}</span>
                <span className="hidden pr-1 text-[10px] text-slate-400 sm:block">⌄</span>
              </button>
              {accountOpen && (
                <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-[80] w-64 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center gap-3 rounded-2xl bg-[#0b1c39] p-3 text-white">
                    <Avatar profile={profile} size="h-10 w-10" />
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{profileName(profile)}</p><p className="mt-0.5 text-[11px] text-slate-300">Identidade ZION</p></div>
                  </div>
                  <Link role="menuitem" href="/profile" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ResaIcon name="user" size={16} />Perfil</Link>
                  <Link role="menuitem" href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ResaIcon name="settings" size={16} />Conta e segurança</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-4 left-4 top-[82px] z-50 hidden w-[76px] flex-col items-center rounded-[26px] border border-white/80 bg-white/90 py-3 shadow-[0_18px_55px_rgba(15,35,65,0.10)] backdrop-blur-2xl lg:flex" aria-label="Navegação principal RESA">
        <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
          {primaryNavigation.map(([name, icon, href]) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-label={name} aria-current={active ? "page" : undefined} title={name} className={`group flex w-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${active ? "bg-[#091735] text-white shadow-[0_8px_22px_rgba(9,23,53,0.18)]" : "text-slate-500 hover:bg-slate-100 hover:text-[#091735]"}`}>
                <ResaIcon name={icon} size={19} />
                <span className="text-[9px] font-semibold leading-none">{name}</span>
              </Link>
            );
          })}
        </nav>
        <div ref={moreRef} className="relative mt-2 w-full px-2">
          <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-haspopup="menu" aria-label="Mais áreas do RESA" title="Mais áreas" className={`flex w-full flex-col items-center gap-1 rounded-2xl py-3 text-slate-500 transition hover:bg-slate-100 hover:text-[#091735] ${activeMore || moreOpen ? "bg-slate-100 text-[#091735]" : ""}`}>
            <ResaIcon name="more" size={19} /><span className="text-[9px] font-semibold">Mais</span>
          </button>
          {moreOpen && <div role="menu" className="absolute bottom-0 left-[calc(100%+12px)] w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
            {secondaryNavigation.map(([name, icon, href]) => <Link key={href} role="menuitem" href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive(href) ? "bg-slate-100 text-[#091735]" : "text-slate-600 hover:bg-slate-50"}`}><ResaIcon name={icon} size={16} />{name}</Link>)}
          </div>}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/80 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-12px_35px_rgba(15,35,65,0.08)] backdrop-blur-2xl lg:hidden" aria-label="Navegação móvel RESA">
        <div className="mx-auto flex max-w-xl items-stretch justify-around gap-1">
          {primaryNavigation.filter(([, , href]) => ["/resa", "/resa/explore", "/resa/reels", "/resa/communities", "/resa/messages"].includes(href)).map(([name, icon, href]) => {
            const active = isActive(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${active ? "text-[#0b1c39]" : "text-slate-400 hover:text-slate-700"}`}>
              <span className={`flex h-8 w-10 items-center justify-center rounded-xl ${active ? "bg-[#edf3fb]" : ""}`}><ResaIcon name={icon} size={19} /></span><span className="truncate">{name}</span>
            </Link>;
          })}
          <div className="relative flex min-w-0 flex-1 items-center justify-center" ref={moreRef}>
            <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-haspopup="menu" className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${activeMore || moreOpen ? "text-[#0b1c39]" : "text-slate-400"}`}>
              <span className={`flex h-8 w-10 items-center justify-center rounded-xl ${activeMore || moreOpen ? "bg-[#edf3fb]" : ""}`}><ResaIcon name="more" size={19} /></span><span>Mais</span>
            </button>
            {moreOpen && <div role="menu" className="absolute bottom-[calc(100%+12px)] right-0 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
              {secondaryNavigation.concat([["Lives", "live", "/resa/live"] as const]).map(([name, icon, href]) => <Link key={href} role="menuitem" href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive(href) ? "bg-slate-100 text-[#091735]" : "text-slate-600 hover:bg-slate-50"}`}><ResaIcon name={icon} size={16} />{name}</Link>)}
            </div>}
          </div>
        </div>
      </nav>
    </>
  );
}
