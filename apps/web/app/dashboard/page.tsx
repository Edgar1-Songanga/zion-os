import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type WorkArea = { title: string; description: string; href: string };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as
    | { sub?: string; app_metadata?: Record<string, unknown> }
    | undefined;

  if (!claims?.sub) {
    redirect("/auth/sign-in?next=/dashboard");
  }

  const metadata = claims.app_metadata ?? {};
  const isGlobalAdmin = metadata.zion_global_role === "global_admin";
  const globalAdminVerified = isGlobalAdmin && metadata.zion_verified === true;

  let roleKeys: string[] = [];
  let accessLookupFailed = false;
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role_id")
    .eq("user_id", claims.sub)
    .eq("status", "ACTIVE");
  if (membershipError) accessLookupFailed = true;

  const roleIds = [...new Set((memberships ?? []).map((item) => item.role_id).filter(Boolean))];
  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabase.from("roles").select("key").in("id", roleIds);
    if (rolesError) accessLookupFailed = true;
    roleKeys = (roles ?? []).map((role) => role.key).filter(Boolean);
  }

  const has = (...keys: string[]) => roleKeys.some((key) => keys.includes(key));
  const hasInstitutionalRole = roleKeys.some((key) => !["member", "moderator"].includes(key));
  if (!accessLookupFailed && !globalAdminVerified && !isGlobalAdmin && !hasInstitutionalRole) {
    redirect("/resa");
  }
  const areas: WorkArea[] = [];

  if (globalAdminVerified) {
    areas.push(
      { title: "Administração global", description: "Governação da plataforma e hierarquia institucional.", href: "/admin" },
      { title: "Secretaria", description: "Registos e processos de membresia.", href: "/secretariat" },
      { title: "Tesouraria", description: "Contabilidade, contribuições e relatórios financeiros.", href: "/finance" },
      { title: "Ministérios", description: "Departamentos, equipas e atividade ministerial.", href: "/ministry" },
      { title: "Relatórios", description: "Indicadores e acompanhamento institucional.", href: "/reports" },
      { title: "Recursos humanos", description: "Gestão de pessoas nos níveis autorizados.", href: "/hr" },
      { title: "Processamento salarial", description: "Operações de processamento salarial.", href: "/payroll" },
      { title: "Administração da igreja", description: "Estrutura e gestão da organização local.", href: "/church-administration" },
    );
  } else {
    if (isGlobalAdmin) {
      areas.push({
        title: "Administração global — verificação pendente",
        description: "A função global está identificada, mas a verificação administrativa ainda não está concluída.",
        href: "/dashboard",
      });
    }
    if (has("organization_owner", "organization_admin", "organization_leader")) {
      areas.push({ title: "Administração da igreja", description: "Visão e gestão da organização.", href: "/church-administration" });
    }
    if (has("secretary", "finance_manager", "hr_manager", "payroll_manager", "organization_owner", "organization_admin")) {
      areas.push({ title: "Relatórios", description: "Indicadores e relatórios autorizados.", href: "/reports" });
    }
    if (has("secretary", "organization_owner", "organization_admin")) {
      areas.push({ title: "Secretaria", description: "Registos e processos de membresia.", href: "/secretariat" });
    }
    if (has("finance_manager", "organization_owner", "organization_admin")) {
      areas.push({ title: "Tesouraria", description: "Contabilidade, contribuições e relatórios financeiros.", href: "/finance" });
    }
    if (has("stewardship_manager")) {
      areas.push({ title: "Mordomia Cristã", description: "Operações e relatórios do departamento de Mordomia atribuído.", href: "/stewardship" });
    }
    if (has("pastor", "ministry_leader", "department_leader", "sabbath_school_director")) {
      areas.push({ title: "Ministérios e departamentos", description: "Gestão da área ministerial atribuída.", href: "/ministry" });
    }
    if (has("youth_director")) {
      areas.push({ title: "Ministério Jovem", description: "Gestão dos programas e atividades juvenis atribuídos.", href: "/youth" });
    }
    if (has("hr_manager", "organization_owner", "organization_admin")) {
      areas.push({ title: "Recursos humanos", description: "Gestão de pessoas nos níveis autorizados.", href: "/hr" });
    }
    if (has("payroll_manager", "organization_owner", "organization_admin")) {
      areas.push({ title: "Processamento salarial", description: "Operações de processamento salarial.", href: "/payroll" });
    }
  }

  if (!globalAdminVerified && !isGlobalAdmin && areas.length === 0) {
    areas.push({
      title: accessLookupFailed ? "Não foi possível carregar as permissões" : "Área administrativa não atribuída",
      description: accessLookupFailed
        ? "A consulta das funções falhou. Nenhuma permissão foi presumida; tente novamente ou peça uma revisão técnica da conta."
        : "Esta conta não apresenta uma função organizacional ativa. Um administrador autorizado deve atribuir a função e a organização corretas.",
      href: "/dashboard",
    });
  }

  areas.push(
    { title: "Comunidade RESA", description: "Aceder à comunidade e às publicações.", href: "/resa" },
  );

  const uniqueAreas = areas.filter((area, index, all) => all.findIndex((item) => item.href === area.href) === index);

  return (
    <DashboardExperience>
      <section className="mx-auto mb-8 w-full max-w-7xl px-4 pt-6 sm:px-8" aria-labelledby="work-area-title">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ZION OS · Acesso por função</p>
              <h1 id="work-area-title" className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">A tua área de trabalho</h1>
              <p className="mt-2 text-sm text-slate-600">As áreas apresentadas dependem das funções e permissões atribuídas à tua conta.</p>
            </div>
            <span className="text-xs text-slate-500">{uniqueAreas.length} área(s) disponível(eis)</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {uniqueAreas.map((area) => {
              const pending = area.title.includes("verificação pendente");
              return pending ? (
                <div key={area.href} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h2 className="font-semibold text-amber-950">{area.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-900">{area.description}</p>
                </div>
              ) : (
                <Link key={area.href} href={area.href} className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-[#C8A24A] hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-slate-900">{area.title}</h2>
                    <span aria-hidden="true" className="text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0B2D4D]">→</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{area.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#0B2D4D]">Abrir área</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <DashboardContent />
    </DashboardExperience>
  );
}
