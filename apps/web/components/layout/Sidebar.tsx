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
    "M12 3v18M3 12h18",
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  ];
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[index % paths.length]} /></svg>;
}

function uniqueSections(sections: NavSection[]): NavSection[] {
  const seen = new Set<string>();
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [globalAdmin, setGlobalAdmin] = useState(false);
  const [roleKeys, setRoleKeys] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const loadAccess = async (user: { id: string; app_metadata?: Record<string, unknown> } | null) => {
      setGlobalAdmin(user?.app_metadata?.zion_global_role === "global_admin");
      if (!user) {
        setRoleKeys([]);
        return;
      }

      try {
        const context = await resaRequest<{ memberships?: Array<{ role?: { key?: string } | null }> }>("/v1/identity/profile/access");
        const apiRoleKeys = (context.memberships ?? [])
          .map((membership) => membership.role?.key ?? "")
          .filter(Boolean);
        if (apiRoleKeys.length > 0) {
          if (active) setRoleKeys(apiRoleKeys);
          return;
        }
      } catch {
        // Fall back to the authenticated user's own RLS-scoped membership records.
      }

      try {
        const { data: memberships, error: membershipError } = await supabase
          .from("organization_memberships")
          .select("role_id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE");
        if (membershipError) throw membershipError;

        const roleIds = [...new Set((memberships ?? []).map((membership) => membership.role_id).filter(Boolean))];
        if (roleIds.length === 0) {
          if (active) setRoleKeys([]);
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from("roles")
          .select("key")
          .in("id", roleIds);
        if (rolesError) throw rolesError;
        if (active) setRoleKeys((roles ?? []).map((role) => role.key).filter(Boolean));
      } catch {
        if (active) setRoleKeys([]);
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (active) void loadAccess(data.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadAccess(session?.user ?? null), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const hasRole = (...keys: string[]) => globalAdmin || roleKeys.some((key) => keys.includes(key));
  const isOrganizationManager = hasRole("organization_owner", "organization_admin", "organization_leader");
  const isMinistryManager = hasRole(
    "organization_owner", "organization_admin", "organization_leader",
    "ministry_leader", "department_leader", "sabbath_school_director", "youth_director",
  );

  const sections = uniqueSections([
    {
      title: "Principal",
      items: [
        { name: t("dashboard"), path: "/dashboard" },
        { name: "RESA — Comunidade", path: "/resa" },
      ],
    },
    {
      title: "Estudo e vida espiritual",
      items: [
        { name: t("bibleEngine"), path: "/bible-engine" },
        { name: t("sabbathSchool"), path: "/sabbath-school" },
        { name: t("devotion"), path: "/devotion" },
        { name: t("spiritualGrowth"), path: "/spiritual-growth" },
        { name: t("spiritualVision"), path: "/spiritual-experience" },
        { name: t("adventistSources"), path: "/adventist-canon" },
        { name: t("spiritualChat"), path: "/spiritual-chat" },
      ],
    },
    {
      title: "Ministérios e participação",
      items: [
        { name: "Ministério Jovem", path: "/youth" },
      ],
    },
    {
      title: "Administração",
      items: [
        ...(globalAdmin ? [{ name: "Administração Global", path: "/admin" }] : []),
        ...(isOrganizationManager ? [{ name: "Administração da Igreja", path: "/church-administration" }] : []),
        ...(isMinistryManager ? [{ name: "Ministérios e departamentos", path: "/ministry" }] : []),
        ...(hasRole("secretary", "organization_owner", "organization_admin") ? [{ name: "Secretaria", path: "/secretariat" }] : []),
        ...(hasRole("finance_manager", "organization_owner", "organization_admin") ? [{ name: "Finanças", path: "/finance" }] : []),
        ...(hasRole("hr_manager", "organization_owner", "organization_admin") ? [{ name: "Recursos Humanos", path: "/hr" }] : []),
        ...(hasRole("payroll_manager", "organization_owner", "organization_admin") ? [{ name: "Processamento salarial", path: "/payroll" }] : []),
        ...(hasRole("organization_owner", "organization_admin", "finance_manager", "hr_manager", "payroll_manager", "secretary") ? [{ name: "Relatórios", path: "/reports" }] : []),
      ],
    },
  ]);

  const nestedActiveRoutes = new Set([
    "/admin", "/church-administration", "/secretariat", "/finance", "/hr",
    "/payroll", "/reports", "/ministry", "/youth", "/resa", "/sabbath-school",
  ]);

  return (
    <aside className="sticky top-0 flex h-screen w-[252px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-3.5 py-5 text-white shadow-[8px_0_30px_rgba(7,30,53,0.10)]">
      <Link href="/dashboard" className="px-3" aria-label="ZION OS — Painel principal">
        <h1 className="text-[25px] font-semibold tracking-[0.24em] text-white">ZION<span className="text-[#C8A24A]">OS</span></h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">{t("globalDigitalEcosystem")}</p>
      </Link>

      <nav className="mt-8 flex-1" aria-label="Navegação principal">
        {sections.map((section, sectionIndex) => (
          <section key={section.title} className="mb-6">
            <h2 className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.title}</h2>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const active = pathname === item.path || (nestedActiveRoutes.has(item.path) && pathname.startsWith(item.path + "/"));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                      active ? "bg-white font-semibold text-[#0B2D4D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]" : "text-slate-200 hover:bg-white/[0.08] hover:text-white",
                    ].join(" ")}
                  >
                    <span className={active ? "text-[#C8A24A]" : "text-slate-400 group-hover:text-[#E0B85A]"}>
                      <NavIcon index={sectionIndex * 4 + itemIndex} />
                    </span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 pt-4 text-[10px] leading-5 text-slate-400">
        A navegação apresenta apenas as áreas disponíveis para a tua função.
      </div>
    </aside>
  );
}
