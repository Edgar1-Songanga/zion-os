"use client";

import Link from "next/link";

const accessProfiles = [
  {
    title: "Membro",
    description: "Perfil pessoal, jornada espiritual, comunidade e pedidos de oração.",
    destination: "/dashboard",
    label: "Entrar como membro",
    icon: "01",
  },
  {
    title: "Dirigente departamental",
    description: "Gestão de ministérios, programas, atividades e acompanhamento.",
    destination: "/ministry",
    label: "Entrar na área departamental",
    icon: "02",
  },
  {
    title: "Ministério Jovem",
    description: "Clubes, participantes, atividades, formação e progressão.",
    destination: "/youth",
    label: "Entrar no Ministério Jovem",
    icon: "03",
  },
  {
    title: "Secretaria",
    description: "Registo e acompanhamento de membros, batismos, famílias e transferências.",
    destination: "/secretariat",
    label: "Entrar na Secretaria",
    icon: "04",
  },
  {
    title: "Tesouraria e Finanças",
    description: "Plano de contas, movimentos financeiros e registos da organização.",
    destination: "/finance",
    label: "Entrar nas Finanças",
    icon: "05",
  },
  {
    title: "Recursos Humanos",
    description: "Registos de colaboradores e processos de RH autorizados.",
    destination: "/hr",
    label: "Entrar em RH",
    icon: "06",
  },
  {
    title: "Administração da igreja",
    description: "Organização, estrutura, equipas e acessos institucionais.",
    destination: "/church-administration",
    label: "Entrar na administração",
    icon: "07",
  },
  {
    title: "Administração global",
    description: "Operações globais da plataforma, disponíveis apenas para administradores autorizados.",
    destination: "/admin",
    label: "Entrar como administrador global",
    icon: "08",
  },
] as const;

export default function AccessProfilesPage() {
  return (
    <main className="min-h-screen bg-[var(--zion-light)] px-5 py-10 text-[var(--zion-dark)] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-[var(--zion-primary)] px-6 py-8 text-white shadow-[var(--zion-shadow-lg)] sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">ZION OS · Acesso institucional</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Como pretende entrar?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
            Escolha a área que corresponde à sua função na igreja. Depois de iniciar sessão, o ZION OS verifica os acessos que lhe foram atribuídos.
          </p>
        </header>

        <section aria-label="Perfis de entrada" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {accessProfiles.map((profile) => (
            <article key={profile.destination} className="flex min-h-64 flex-col rounded-2xl border border-[var(--zion-border)] bg-white p-5 shadow-[var(--zion-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--zion-shadow-lg)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--zion-light)] text-xs font-bold text-[var(--zion-primary)]">{profile.icon}</span>
              <h2 className="mt-5 text-lg font-semibold">{profile.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--zion-muted)]">{profile.description}</p>
              <Link
                href={`/auth/sign-in?next=${encodeURIComponent(profile.destination)}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--zion-primary)] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--zion-primary-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zion-sky)]"
              >
                {profile.label}
              </Link>
            </article>
          ))}
        </section>

        <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Nota de segurança:</strong> escolher um perfil não concede privilégios. As áreas administrativas, financeiras e de secretaria continuam protegidas pelas permissões atribuídas à sua conta. Se não tiver acesso, peça ao administrador da igreja que confirme a sua função.
        </aside>

        <footer className="mt-7 flex flex-col gap-3 text-sm text-[var(--zion-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>É a primeira vez no ZION OS?</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/auth/sign-up" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Criar conta de membro</Link>
            <Link href="/auth/sign-in" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Já tenho conta</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
