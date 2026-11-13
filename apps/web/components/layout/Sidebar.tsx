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
  return (
    <>
      <aside className="sticky top-0 flex h-fit max-h-dvh w-[clamp(112px,26vw,252px)] shrink-0 self-start flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-2 py-4 text-white shadow-[8px_0_30px_rgba(7,30,53,0.10)] md:w-[252px] md:px-3.5 md:py-5">
        <Link href="/dashboard" className="shrink-0 px-1 md:px-3" aria-label="ZION OS — Painel principal">
          <h1 className="text-[19px] font-semibold tracking-[0.16em] text-white md:text-[25px] md:tracking-[0.24em]">ZION<span className="text-[#C8A24A]">OS</span></h1>
          <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-slate-300 md:text-[10px] md:tracking-[0.16em]">{t("globalDigitalEcosystem")}</p>
        </Link>

        <nav className="mt-5 min-h-0 overflow-y-auto overscroll-contain pr-1 md:mt-7 [scrollbar-color:rgba(203,213,225,0.35)_transparent] [scrollbar-width:thin]" aria-label="Navegação principal">
          {sections.map((section, sectionIndex) => (
            <section key={section.title} className="mb-4 last:mb-0 md:mb-5">
              <h2 className="mb-2 px-2 text-[8px] md:px-3 md:text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.title}</h2>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const active = pathname === item.path || (nested.has(item.path) && pathname.startsWith(item.path + "/"));
                  return <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined} className={["group flex min-h-9 items-center gap-2 rounded-lg px-2 py-2 text-[11px] transition-colors md:min-h-10 md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-[13px]", active ? "bg-white font-semibold text-[#0B2D4D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]" : "text-slate-200 hover:bg-white/[0.08] hover:text-white"].join(" ")}>
                    <span className={active ? "text-[#C8A24A]" : "text-slate-400 group-hover:text-[#E0B85A]"}><NavIcon index={sectionIndex * 4 + itemIndex} /></span>
                    <span className="truncate">{item.name}</span>
                  </Link>;
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-2 shrink-0 border-t border-white/10 px-1 pt-2 md:mt-4 md:px-2 md:pt-3">
          <p className="px-1 pb-2 text-[9px] leading-3 text-slate-300 md:px-2 md:text-[10px] md:leading-4">A navegação apresenta apenas as áreas disponíveis para a tua função.</p>
          <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-semibold md:min-h-11 md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-[13px] text-red-200 transition hover:bg-red-500/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0B85A] disabled:cursor-wait disabled:opacity-60">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M21 4v16" /></svg>
            <span>{signingOut ? "A terminar sessão…" : "Terminar sessão"}</span>
          </button>
          {signOutError && <p role="alert" className="px-3 pt-2 text-[11px] text-red-200">Não foi possível terminar a sessão. Tente novamente.</p>}
        </div>
      </aside>


    </>
  );
}
