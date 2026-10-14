"use client";

import Link from "next/link";
import AdministrationHero from "./AdministrationHero";
import OrganizationOverview from "./OrganizationOverview";
import DepartmentsGrid from "./DepartmentsGrid";
import MinistryOverview from "./MinistryOverview";
import MembershipsOverview from "./MembershipsOverview";

const administrationAreas = [
  { title: "Secretaria", description: "Registo de membros, famílias, transferências e batismos.", href: "/secretariat", tag: "Membresia" },
  { title: "Tesouraria e finanças", description: "Plano de contas, lançamentos e consulta financeira.", href: "/finance", tag: "Financeiro" },
  { title: "Recursos humanos", description: "Gestão de pessoas e registos de recursos humanos.", href: "/hr", tag: "Pessoas" },
  { title: "Folha salarial", description: "Processos e operações de processamento salarial.", href: "/payroll", tag: "Pessoal" },
  { title: "Relatórios", description: "Indicadores e relatórios operacionais disponíveis.", href: "/reports", tag: "Controlo" },
  { title: "Ministérios e departamentos", description: "Estrutura ministerial, equipas e atividade departamental.", href: "/ministry", tag: "Departamentos" },
  { title: "Painel da igreja", description: "Visão institucional, unidades e estrutura da organização.", href: "/church-administration", tag: "Organização" },
];

export default function AdminExperience() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <AdministrationHero />

        <section aria-labelledby="administration-areas-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Centro de gestão</p>
            <h2 id="administration-areas-title" className="mt-2 text-2xl font-semibold text-slate-900">Administração</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Aceda aos departamentos da organização a partir de um único lugar. Cada área mantém o seu próprio ecrã e permissões; este painel centraliza a navegação sem duplicar os módulos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {administrationAreas.map((area) => (
              <Link
                key={area.href}
                href={area.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">{area.title}</h3>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{area.tag}</span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{area.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0B2D4D]">
                  Abrir área <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div id="organization-overview" className="scroll-mt-6"><OrganizationOverview /></div>
        <MembershipsOverview />
        <div id="department-overview" className="scroll-mt-6"><DepartmentsGrid /></div>
        <MinistryOverview />
      </div>
    </main>
  );
}
