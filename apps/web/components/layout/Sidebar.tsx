"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/i18n";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type NavItem = { name: string; path: string };
type NavSection = { title: string; items: NavItem[] };

function NavIcon({ index }: { index: number }) {
  const paths = [
    "M3 10.5 12 3l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-8Z",
    "M4 5h16v14H4z M8 9h8 M8 13h5",
    "M12 3v18M3 12h18",
    "M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M4 5h16v15H4z M8 2v6M16 2v6M4 10h16",
    "M12 21s-7-4.35-7-10V5l7-3 7 3v6c0 5.65-7 10-7 10Z",
    "M4 18h16M6 18V9M10 18V5M14 18v-7M18 18V7",
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  ];
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[index % paths.length]} /></svg>;
}

function uniqueSections(sections: NavSection[]): NavSection[] {
  const seen = new Set<string>();
  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    }),
  })).filter((section) => section.items.length > 0);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [globalAdmin, setGlobalAdmin] = useState(false);
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const loadAccess = async (user: { id: string; app_metadata?: Record<string, unknown> } | null) => {
      setGlobalAdmin(user?.app_metadata?.zion_global_role === "global_admin" && user?.app_metadata?.zion_verified === true);
      if (!user) { setRoleKeys([]); return; }
      try {
        const context = await resaRequest<{ memberships?: Array<{ role?: { key?: string } | null }> }>("/v1/identity/profile/access");
        const keys = (context.memberships ?? []).map((membership) => membership.role?.key ?? "").filter(Boolean);
        if (keys.length > 0) { if (active) setRoleKeys(keys); return; }
      } catch { /* Use the user's own RLS-scoped membership records as fallback. */ }
      try {
        const { data: memberships, error } = await supabase.from("organization_memberships").select("role_id").eq("user_id", user.id).eq("status", "ACTIVE");
        if (error) throw error;
        const ids = [...new Set((memberships ?? []).map((membership) => membership.role_id).filter(Boolean))];
        if (!ids.length) { if (active) setRoleKeys([]); return; }
        const { data: roles, error: rolesError } = await supabase.from("roles").select("key").in("id", ids);
        if (rolesError) throw rolesError;
        if (active) setRoleKeys((roles ?? []).map((role) => role.key).filter(Boolean));
      } catch { if (active) setRoleKeys([]); }
    };
    void supabase.auth.getUser().then(({ data }) => { if (active) void loadAccess(data.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadAccess(session?.user ?? null), 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(false);
    const { error } = await createClient().auth.signOut();
    if (error) {
      console.error("[ZION auth] Sign out failed.", error);
      setSigningOut(false);
      setSignOutError(true);
      return;
    }
    window.location.replace("/auth/sign-in");
  }

  const hasRole = (...keys: string[]) => globalAdmin || roleKeys.some((key) => keys.includes(key));
  const isOrganizationManager = hasRole("organization_owner", "organization_admin", "organization_leader");
  const isMinistryManager = hasRole("organization_owner", "organization_admin", "organization_leader", "pastor", "ministry_leader", "department_leader", "sabbath_school_director");
  const isStewardshipManager = !globalAdmin && hasRole("stewardship_manager");
  const isYouthDirector = hasRole("youth_director");

  const sections = uniqueSections([
    { title: "Principal", items: [{ name: t("dashboard"), path: "/dashboard" }, { name: "RESA — Comunidade", path: "/resa" }] },
    { title: "Estudo e vida espiritual", items: [
      { name: t("bibleEngine"), path: "/bible-engine" }, { name: t("sabbathSchool"), path: "/sabbath-school" },
      { name: t("devotion"), path: "/devotion" }, { name: t("spiritualGrowth"), path: "/spiritual-growth" },
      { name: t("spiritualVision"), path: "/spiritual-experience" }, { name: t("adventistSources"), path: "/adventist-canon" },
      { name: t("spiritualChat"), path: "/spiritual-chat" },
    ] },
    { title: "Ministérios e participação", items: [
      ...(isMinistryManager || isYouthDirector ? [{ name: "Ministério Jovem", path: "/youth" }] : []),
      ...(isStewardshipManager ? [{ name: "Mordomia Cristã", path: "/stewardship" }] : []),
    ] },
    { title: "Administração", items: [
      ...(globalAdmin ? [{ name: "Administração Global", path: "/admin" }, { name: "Verificação de contas", path: "/admin/verification" }] : []),
      ...(isOrganizationManager ? [{ name: "Administração da Igreja", path: "/church-administration" }] : []),
      ...(isMinistryManager ? [{ name: "Ministérios e departamentos", path: "/ministry" }] : []),
      ...(isStewardshipManager ? [{ name: "Mordomia Cristã", path: "/stewardship" }] : []),
      ...(hasRole("secretary", "organization_owner", "organization_admin") ? [{ name: "Secretaria", path: "/secretariat" }] : []),
      ...(hasRole("finance_manager", "organization_owner", "organization_admin") ? [{ name: "Finanças", path: "/finance" }] : []),
      ...(hasRole("hr_manager", "organization_owner", "organization_admin") ? [{ name: "Recursos Humanos", path: "/hr" }] : []),
      ...(hasRole("payroll_manager", "organization_owner", "organization_admin") ? [{ name: "Processamento salarial", path: "/payroll" }] : []),
      ...(hasRole("organization_owner", "organization_admin") ? [{ name: "Relatórios", path: "/reports" }] : []),
    ] },
  ]);

  const nested = new Set(["/admin", "/church-administration", "/secretariat", "/finance", "/hr", "/payroll", "/reports", "/ministry", "/youth", "/stewardship", "/resa", "/sabbath-school"]);
  const mobileItems = [
    { name: t("dashboard"), path: "/dashboard", icon: 0 },
    { name: "RESA", path: "/resa", icon: 1 },
    { name: t("bibleEngine"), path: "/bible-engine", icon: 2 },
    { name: t("devotion"), path: "/devotion", icon: 3 },
  ];

  return (
    <>
      <aside className="sticky top-0 hidden h-fit max-h-dvh w-[252px] shrink-0 self-start flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-3.5 py-5 text-white shadow-[8px_0_30px_rgba(7,30,53,0.10)] md:flex">
        <Link href="/dashboard" className="shrink-0 px-3" aria-label="ZION OS — Painel principal">
          <h1 className="text-[25px] font-semibold tracking-[0.24em] text-white">ZION<span className="text-[#C8A24A]">OS</span></h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">{t("globalDigitalEcosystem")}</p>
        </Link>

        <nav className="mt-7 max-h-[calc(100dvh-190px)] min-h-0 shrink overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(203,213,225,0.35)_transparent] [scrollbar-width:thin]" aria-label="Navegação principal">
          {sections.map((section, sectionIndex) => (
            <section key={section.title} className="mb-5 last:mb-0">
              <h2 className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.title}</h2>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const active = pathname === item.path || (nested.has(item.path) && pathname.startsWith(item.path + "/"));
                  return <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined} className={["group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors", active ? "bg-white font-semibold text-[#0B2D4D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]" : "text-slate-200 hover:bg-white/[0.08] hover:text-white"].join(" ")}>
                    <span className={active ? "text-[#C8A24A]" : "text-slate-400 group-hover:text-[#E0B85A]"}><NavIcon index={sectionIndex * 4 + itemIndex} /></span>
                    <span className="truncate">{item.name}</span>
                  </Link>;
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-4 shrink-0 border-t border-white/10 px-2 pt-3">
          <p className="px-2 pb-2 text-[10px] leading-4 text-slate-300">A navegação apresenta apenas as áreas disponíveis para a tua função.</p>
          <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-200 transition hover:bg-red-500/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0B85A] disabled:cursor-wait disabled:opacity-60">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M21 4v16" /></svg>
            <span>{signingOut ? "A terminar sessão…" : "Terminar sessão"}</span>
          </button>
          {signOutError && <p role="alert" className="px-3 pt-2 text-[11px] text-red-200">Não foi possível terminar a sessão. Tente novamente.</p>}
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/35" />
          <aside
            id="mobile-main-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className="absolute bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 flex max-h-[78dvh] w-[min(272px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-3.5 py-4 text-white shadow-[0_18px_55px_rgba(7,30,53,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 px-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[21px] font-semibold tracking-[0.2em]">ZION<span className="text-[#C8A24A]">OS</span></h2>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-slate-300">{t("globalDigitalEcosystem")}</p>
                </div>
                <button type="button" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0B85A]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <nav className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(203,213,225,0.35)_transparent] [scrollbar-width:thin]" aria-label="Navegação móvel completa">
              {sections.map((section, sectionIndex) => (
                <section key={section.title} className="mb-4 last:mb-0">
                  <h3 className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.title}</h3>
                  <div className="space-y-1">
                    {section.items.map((item, itemIndex) => {
                      const active = pathname === item.path || (nested.has(item.path) && pathname.startsWith(item.path + "/"));
                      return <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)} aria-current={active ? "page" : undefined} className={["group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors", active ? "bg-white font-semibold text-[#0B2D4D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]" : "text-slate-200 hover:bg-white/[0.08] hover:text-white"].join(" ")}>
                        <span className={active ? "text-[#C8A24A]" : "text-slate-400 group-hover:text-[#E0B85A]"}><NavIcon index={sectionIndex * 4 + itemIndex} /></span>
                        <span className="truncate">{item.name}</span>
                      </Link>;
                    })}
                  </div>
                </section>
              ))}
            </nav>
            <div className="mt-3 shrink-0 border-t border-white/10 px-2 pt-3">
              <p className="px-2 pb-2 text-[10px] leading-4 text-slate-300">A navegação apresenta apenas as áreas disponíveis para a tua função.</p>
              <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-200 transition hover:bg-red-500/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0B85A] disabled:cursor-wait disabled:opacity-60">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M21 4v16" /></svg>
                <span>{signingOut ? "A terminar sessão…" : "Terminar sessão"}</span>
              </button>
              {signOutError && <p role="alert" className="px-3 pt-2 text-[11px] text-red-200">Não foi possível terminar a sessão. Tente novamente.</p>}
            </div>
          </aside>
        </div>
      )}

      <nav aria-label="Navegação móvel rápida" className="fixed inset-x-3 bottom-[env(safe-area-inset-bottom)] z-40 flex h-[58px] items-stretch justify-around rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-1 pt-1 text-white shadow-[0_-5px_24px_rgba(7,30,53,0.22)] md:hidden">
        {mobileItems.map((item) => {
          const active = pathname === item.path || (nested.has(item.path) && pathname.startsWith(item.path + "/"));
          return <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined} className={"flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium " + (active ? "bg-white/12 text-white" : "text-slate-300")}>
            <NavIcon index={item.icon} />
            <span className="max-w-full truncate">{item.name}</span>
          </Link>;
        })}
        <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-main-menu" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold text-[#E0B85A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0B85A]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
