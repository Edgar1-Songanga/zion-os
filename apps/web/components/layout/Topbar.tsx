"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import LanguageSelector from "@/components/language/LanguageSelector";
import { useTranslation } from "@/components/i18n";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function roleLabel(user: User | null) {
  const metadata = user?.app_metadata ?? {};
  if (metadata.zion_global_role === "global_admin") return "Administrador Global";
  if (metadata.zion_global_role === "member") return "Membro ZION";
  return "Perfil institucional por configurar";
}

export default function Topbar() {
  const { t } = useTranslation();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const loadIdentity = async (nextUser?: User | null) => {
      try {
        const current = nextUser === undefined ? (await supabase.auth.getUser()).data.user : nextUser;
        if (!active) return;
        setUser(current ?? null);
        if (current) {
          try {
            const nextProfile = await resaRequest<Profile>("/v1/identity/profile");
            if (active) setProfile(nextProfile);
          } catch {
            if (active) setProfile(null);
          }
        } else if (active) {
          setProfile(null);
        }
      } catch {
        if (active) { setUser(null); setProfile(null); }
      }
    };
    void loadIdentity();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadIdentity(session?.user ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const displayName = useMemo(() => {
    return profile?.display_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.email ||
      "Conta ZION";
  }, [profile, user]);

  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Z";
  const role = roleLabel(user);
  const emailVerified = Boolean(user?.email_confirmed_at);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    setMenuOpen(false);
    window.location.replace("/auth/sign-in");
  }

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-5">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-[0.12em] text-[#0B2D4D]">ZION OS</h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{t("brandDescription")}</p>
        </div>
        <div className="hidden min-w-[260px] max-w-[420px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
          <span className="text-xs text-slate-400">{t("search")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <LanguageSelector />
        <button type="button" aria-label="Tema" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#C8A24A] hover:text-[#0B2D4D] sm:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round" /><circle cx="12" cy="12" r="3.5" /></svg>
        </button>
        <button type="button" aria-label="Notificações" className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#C8A24A] hover:text-[#0B2D4D] sm:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div ref={menuRef} className="relative ml-1 border-l border-slate-200 pl-3">
          <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex max-w-[230px] items-center gap-2 rounded-2xl p-1.5 text-left transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B2D4D] text-sm font-semibold text-white ring-2 ring-[#C8A24A]/30">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <span className="hidden min-w-0 text-left lg:block">
              <span className="block max-w-[145px] truncate text-xs font-semibold text-[#0B2D4D]">{displayName}</span>
              <span className="block max-w-[145px] truncate text-[10px] text-slate-500">{role}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className={"hidden h-4 w-4 text-slate-400 transition sm:block " + (menuOpen ? "rotate-180" : "")} fill="currentColor"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(12,26,61,0.18)]">
              <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B2D4D] font-semibold text-white">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0B2D4D]">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email ?? "Sessão não identificada"}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-600">{role}</p>
                  </div>
                </div>
                <p className={"mt-3 rounded-lg px-2.5 py-1.5 text-[11px] " + (emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
                  {emailVerified ? "Email confirmado" : "Email por confirmar"}
                </p>
              </div>
              <div className="p-2">
                <Link role="menuitem" href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <span aria-hidden="true" className="w-5 text-center">◎</span> O meu perfil
                </Link>
                <Link role="menuitem" href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <span aria-hidden="true" className="w-5 text-center">⚙</span> Conta e segurança
                </Link>
                <button role="menuitem" type="button" onClick={() => void signOut()} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  <span aria-hidden="true" className="w-5 text-center">↪</span> {signingOut ? "A terminar sessão…" : "Terminar sessão"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
