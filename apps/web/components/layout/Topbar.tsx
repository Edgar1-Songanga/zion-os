"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import LanguageSelector from "@/components/language/LanguageSelector";
import { useTranslation } from "@/components/i18n";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import NotificationBell from "@/components/notifications/NotificationBell";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type Membership = {
  id: string;
  role: { key: string; name: string } | null;
  organization: { id: string; name: string; organization_type: string; parent_id: string | null } | null;
  units: Array<{ id: string; name: string; unit_type: string }>;
};

function roleLabel(user: User | null, memberships: Membership[]) {
  const metadata = user?.app_metadata ?? {};
  if (metadata.zion_global_role === "global_admin") return "Administrador Global";
  if (memberships.length) {
    const labels = memberships.map((item) => {
      const role = item.role?.name;
      const level = item.organization?.organization_type?.replace(/_/g, " ").toLowerCase();
      return [role, level].filter(Boolean).join(" · ");
    }).filter(Boolean);
    return labels.join(" / ") || "Membro institucional";
  }
  if (metadata.zion_global_role === "member") return "Membro ZION";
  return "Perfil institucional por configurar";
}

export default function Topbar({ sidebarCollapsed = false, onMobileMenuClick, onDesktopCollapseClick }: { sidebarCollapsed?: boolean; onMobileMenuClick?: () => void; onDesktopCollapseClick?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
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
          const [profileResult, accessResult] = await Promise.allSettled([
            resaRequest<Profile>("/v1/identity/profile"),
            resaRequest<{ memberships?: Membership[] }>("/v1/identity/profile/access"),
          ]);
          if (active) {
            setProfile(profileResult.status === "fulfilled" ? profileResult.value : null);
            setMemberships(accessResult.status === "fulfilled" ? accessResult.value.memberships ?? [] : []);
          }
        } else if (active) {
          setProfile(null);
          setMemberships([]);
        }
      } catch {
        if (active) { setUser(null); setProfile(null); setMemberships([]); }
      }
    };
    void loadIdentity();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadIdentity(session?.user ?? null), 0);
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

  const quickLinks = useMemo(() => {
    const common = [
      { label: "Painel principal", description: "Visão geral da organização", path: "/dashboard", keywords: "início home dashboard" },
      { label: "Comunidade RESA", description: "Publicações e comunidade", path: "/resa", keywords: "social feed publicações" },
      { label: "Motor de Estudo Bíblico", description: "Pesquisa e estudo das Escrituras", path: "/bible-engine", keywords: "bíblia escrituras estudo" },
      { label: "Escola Sabatina", description: "Lições, classes e actividades", path: "/sabbath-school", keywords: "lição classes sabado" },
      { label: "Devoção diária", description: "Leitura e reflexão espiritual", path: "/devotion", keywords: "devocional diário" },
      { label: "Crescimento espiritual", description: "Desafios e progresso espiritual", path: "/spiritual-growth", keywords: "crescimento desafio" },
      { label: "Experiência espiritual", description: "Registos de vida espiritual", path: "/spiritual-experience", keywords: "experiência testemunho" },
      { label: "Fontes Adventistas", description: "Biblioteca de referências", path: "/adventist-canon", keywords: "fontes biblioteca ellen white" },
      { label: "Assistente espiritual", description: "Conversa e orientação bíblica", path: "/spiritual-chat", keywords: "chat inteligência artificial assistente" },
      { label: "O meu perfil", description: "Dados e identidade pessoal", path: "/profile", keywords: "conta perfil" },
      { label: "Conta e segurança", description: "Sessão e protecção da conta", path: "/account", keywords: "segurança autenticação password" },
    ];
    const roles = memberships.map((item) => item.role?.key ?? "");
    const isGlobalAdmin = user?.app_metadata?.zion_global_role === "global_admin" && user?.app_metadata?.zion_verified === true;
    const hasRole = (...keys: string[]) => isGlobalAdmin || roles.some((key) => keys.includes(key));
    const privileged = [
      ...(isGlobalAdmin ? [
        { label: "Administração global", description: "Controlo institucional global", path: "/admin", keywords: "admin global" },
        { label: "Verificação de contas", description: "Revisão de perfis e documentos", path: "/admin/verification", keywords: "verificar identidade" },
      ] : []),
      ...(hasRole("organization_owner", "organization_admin", "organization_leader") ? [
        { label: "Administração da igreja", description: "Estrutura e gestão da organização", path: "/church-administration", keywords: "igreja organização" },
        { label: "Ministérios e departamentos", description: "Gestão dos ministérios locais", path: "/ministry", keywords: "departamentos ministérios" },
      ] : []),
      ...(hasRole("youth_director", "organization_owner", "organization_admin", "organization_leader", "pastor", "ministry_leader", "department_leader") ? [
        { label: "Ministério Jovem", description: "Clubes, actividades e operações juvenis", path: "/youth", keywords: "jovens desbravadores aventureiros" },
      ] : []),
      ...(hasRole("stewardship_manager") ? [
        { label: "Mordomia Cristã", description: "Recursos e participação", path: "/stewardship", keywords: "mordomia" },
      ] : []),
      ...(hasRole("secretary", "organization_owner", "organization_admin") ? [
        { label: "Secretaria", description: "Membros e registos institucionais", path: "/secretariat", keywords: "secretariado membros" },
      ] : []),
      ...(hasRole("finance_manager", "organization_owner", "organization_admin") ? [
        { label: "Finanças", description: "Gestão financeira", path: "/finance", keywords: "tesouraria finanças" },
      ] : []),
      ...(hasRole("hr_manager", "organization_owner", "organization_admin") ? [
        { label: "Recursos humanos", description: "Gestão de pessoas", path: "/hr", keywords: "rh pessoal" },
      ] : []),
      ...(hasRole("payroll_manager", "organization_owner", "organization_admin") ? [
        { label: "Processamento salarial", description: "Folha de salários", path: "/payroll", keywords: "salário payroll" },
      ] : []),
      ...(hasRole("organization_owner", "organization_admin") ? [
        { label: "Relatórios", description: "Relatórios institucionais", path: "/reports", keywords: "relatórios documentos" },
      ] : []),
    ];
    return [...common, ...privileged];
  }, [memberships, user]);

  const filteredQuickLinks = useMemo(() => {
    const query = quickSearchQuery.trim().toLocaleLowerCase();
    if (!query) return quickLinks.slice(0, 8);
    return quickLinks.filter((item) =>
      [item.label, item.description, item.path, item.keywords].join(" ").toLocaleLowerCase().includes(query),
    ).slice(0, 10);
  }, [quickLinks, quickSearchQuery]);

  function openQuickSearch() {
    setMenuOpen(false);
    setQuickSearchOpen(true);
    setQuickSearchQuery("");
  }

  function navigateQuickLink(path: string) {
    setQuickSearchOpen(false);
    setQuickSearchQuery("");
    router.push(path);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenuOpen(false);
        setQuickSearchQuery("");
        setQuickSearchOpen(true);
      }
      if (event.key === "Escape") setQuickSearchOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!quickSearchOpen) return;
    quickSearchRef.current?.focus();
  }, [quickSearchOpen]);

  const displayName = useMemo<string>(() => {
    return profile?.display_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.email ||
      "Conta ZION";
  }, [profile, user]);

  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Z";
  const role = roleLabel(user, memberships);
  const profileVerified = user?.app_metadata?.zion_verified === true;
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
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-2 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-5">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[0.08em] text-[#0B2D4D] sm:text-[18px] sm:tracking-[0.12em]">ZION OS</h2>
          <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">{t("brandDescription")}</p>
        </div>
        <button type="button" onClick={openQuickSearch} aria-label="Abrir pesquisa e acesso rápido" aria-keyshortcuts="Control+K Meta+K" className="hidden min-w-[220px] max-w-[420px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-[#C8A24A] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A] md:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">Pesquisar módulos e páginas…</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl K</kbd>
        </button>
        <button type="button" onClick={openQuickSearch} aria-label="Pesquisar" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#C8A24A] hover:text-[#0B2D4D] md:hidden">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      {quickSearchOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[#07152b]/55 px-3 pt-[12vh] backdrop-blur-sm sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickSearchOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="zion-quick-search-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
              <label id="zion-quick-search-title" className="sr-only" htmlFor="zion-quick-search-input">Pesquisar módulos e páginas</label>
              <input id="zion-quick-search-input" ref={quickSearchRef} autoComplete="off" value={quickSearchQuery} onChange={(event) => setQuickSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && filteredQuickLinks[0]) navigateQuickLink(filteredQuickLinks[0].path); }} placeholder="Pesquisar módulos e páginas…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#0B2D4D] outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => setQuickSearchOpen(false)} aria-label="Fechar pesquisa" className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">Esc</button>
            </div>
            <div className="max-h-[min(60vh,460px)] overflow-y-auto p-2">
              <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{quickSearchQuery.trim() ? "Resultados" : "Acesso rápido"}</p>
              {filteredQuickLinks.length ? filteredQuickLinks.map((item) => (
                <button key={item.path} type="button" onClick={() => navigateQuickLink(item.path)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B2D4D]/5 text-[#0B2D4D]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v14H4zM8 9h8M8 13h5" strokeLinecap="round" /></svg></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#0B2D4D]">{item.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span></span>
                  <span className="text-xs text-slate-300">↗</span>
                </button>
              )) : <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhum módulo corresponde à pesquisa.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[10px] text-slate-400"><span>Os acessos continuam sujeitos às permissões da conta.</span><span>Enter para abrir</span></div>
          </section>
        </div>
      )}

      <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2.5">
        <LanguageSelector />
        <NotificationBell />

        <div ref={menuRef} className="relative ml-0.5 border-l border-slate-200 pl-1.5 sm:ml-1 sm:pl-3">
          <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex max-w-[230px] items-center gap-1 rounded-2xl p-1 text-left transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A24A]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B2D4D] text-xs sm:h-9 sm:w-9 sm:text-sm font-semibold text-white ring-2 ring-[#C8A24A]/30">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <span className="hidden min-w-0 text-left lg:block">
              <span className="flex max-w-[145px] items-center gap-1 truncate text-xs font-semibold text-[#0B2D4D]">{displayName}{profileVerified && <svg aria-label="Perfil verificado" role="img" viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-sky-600" fill="currentColor"><path fillRule="evenodd" d="M10 1.5a2.3 2.3 0 0 1 1.85.93l.46.62.76.1a2.3 2.3 0 0 1 1.93 1.38l.28.71.71.28a2.3 2.3 0 0 1 1.38 1.93l.1.76.62.46a2.3 2.3 0 0 1 .93 1.85 2.3 2.3 0 0 1-.93 1.85l-.62.46-.1.76a2.3 2.3 0 0 1-1.38 1.93l-.71.28-.28.71a2.3 2.3 0 0 1-1.93 1.38l-.76.1-.46.62a2.3 2.3 0 0 1-1.85.93 2.3 2.3 0 0 1-1.85-.93l-.46-.62-.76-.1A2.3 2.3 0 0 1 5 15.97l-.28-.71-.71-.28a2.3 2.3 0 0 1-1.38-1.93l-.1-.76-.62-.46A2.3 2.3 0 0 1 .98 10a2.3 2.3 0 0 1 .93-1.85l.62-.46.1-.76A2.3 2.3 0 0 1 4 5.0l.71-.28L5 4.01a2.3 2.3 0 0 1 1.93-1.38l.76-.1.46-.62A2.3 2.3 0 0 1 10 1.5Zm3.12 6.77a.75.75 0 0 0-1.06-1.06L8.9 10.37 7.94 9.4a.75.75 0 1 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3.68-3.69Z" clipRule="evenodd" /></svg>}</span>
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
                    {memberships.slice(0, 3).map((membership) => (
                      <p key={membership.id} className="mt-1 truncate text-[10px] text-slate-500">
                        {membership.organization?.name ?? "Organização"}{membership.units.length ? " · " + membership.units.map((unit) => unit.name).join(", ") : ""}
                      </p>
                    ))}
                  </div>
                </div>
                <p className={"mt-3 rounded-lg px-2.5 py-1.5 text-[11px] " + (profileVerified ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600")}>
                  {profileVerified ? "Perfil verificado" : "Perfil não verificado"}
                </p>
                <p className={"mt-2 rounded-lg px-2.5 py-1.5 text-[11px] " + (emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
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
