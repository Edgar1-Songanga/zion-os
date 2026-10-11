"use client";

import Link from "next/link";
import { YOUTH_PROGRAMS } from "@/components/youth/core/YouthProgram";
import { getMinistryCatalogEntry } from "@/components/ministry/ministry-catalog";
import YouthClubOperations from "./YouthClubOperations";

const CATALOG_ID_BY_PROGRAM: Record<string, string> = {
  adventurers: "adventurer-club",
  pathfinders: "pathfinder-club",
  ambassadors: "ambassadors",
  "young-adults": "young-adults",
  "public-campus-ministries": "public-campus-ministries",
};

const PROGRAM_DETAILS: Record<string, { eyebrow: string; outcomes: string[] }> = {
  adventurers: {
    eyebrow: "INFÂNCIA E FAMÍLIA",
    outcomes: ["Classes e experiências por idade", "Participação ativa da família", "Descoberta, fé e serviço"],
  },
  pathfinders: {
    eyebrow: "FORMAÇÃO E AVENTURA",
    outcomes: ["Classes progressivas", "Especialidades e competências práticas", "Acampamentos, liderança e serviço", "Registos de progresso e investiduras"],
  },
  ambassadors: {
    eyebrow: "LIDERANÇA JOVEM",
    outcomes: ["Discipulado e mentoria", "Liderança e missão", "Serviço e desenvolvimento de competências"],
  },
  "young-adults": {
    eyebrow: "VIDA ADULTA E MISSÃO",
    outcomes: ["Comunidade e crescimento espiritual", "Vocação, mentoria e liderança", "Missão e serviço"],
  },
  "public-campus-ministries": {
    eyebrow: "UNIVERSIDADE E CAMPUS",
    outcomes: ["Grupos e discipulado no campus", "Liderança estudantil", "Apoio à comunidade académica", "Missão em ambientes universitários"],
  },
};

export default function YouthMinistryHub() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] text-[#0C1A3D]">
      <section className="relative isolate overflow-hidden bg-[#071126]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,166,91,0.22),_transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D9BD78]">ZION OS · ECOSSISTEMA MINISTERIAL</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Ministério Jovem
                <span className="mt-2 block font-light text-[#D9BD78]">Uma missão. Todas as gerações.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Um espaço integrado para conhecer os programas, consultar as suas particularidades e, numa fase operacional, acompanhar clubes, líderes, membros, atividades e progressão.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-medium text-white">Programas disponíveis</p>
              <p className="mt-2 text-4xl font-semibold text-[#D9BD78]">{YOUTH_PROGRAMS.length.toString().padStart(2, "0")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Aventureiros, Desbravadores, Embaixadores, Jovens Adultos e Ministério de Universitários.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Diretório de programas</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Descubra cada ministério</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Os conteúdos são uma base inicial e as referências oficiais permitem confirmar orientações e recursos. A estrutura local pode variar conforme o território.</p>
          </div>
          <Link href="/ministry" className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] transition hover:border-[#B9974D] hover:bg-amber-50">
            Ver todos os ministérios <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {YOUTH_PROGRAMS.map((program) => {
            const catalogEntry = getMinistryCatalogEntry(CATALOG_ID_BY_PROGRAM[program.id]);
            const details = PROGRAM_DETAILS[program.id];
            const isPathfinders = program.id === "pathfinders";

            return (
              <article key={program.id} className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${isPathfinders ? "border-[#C8A24A]/60 ring-1 ring-[#C8A24A]/20 lg:col-span-2" : "border-slate-200"}`}>
                <div className={`grid ${isPathfinders ? "lg:grid-cols-[1.05fr_0.95fr]" : "sm:grid-cols-[0.82fr_1.18fr]"}`}>
                  <div className={`relative min-h-56 overflow-hidden bg-[#0C1A3D] ${isPathfinders ? "lg:min-h-[360px]" : "sm:min-h-[340px]"}`}>
                    {catalogEntry?.coverImage && (
                      <img src={catalogEntry.coverImage} alt={`Fotografia ilustrativa — ${program.name}`} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071126]/90 via-[#071126]/15 to-[#071126]/10" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/25 bg-[#071126]/50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white backdrop-blur">
                      {details.eyebrow}
                    </div>
                    <div className="absolute bottom-5 left-5 right-5">
                      {isPathfinders && <span className="mb-2 inline-block rounded-full bg-[#D9BD78] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#071126]">Programa em destaque</span>}
                      <h3 className={`font-semibold tracking-tight text-white ${isPathfinders ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{program.name}</h3>
                      <p className="mt-2 text-sm text-slate-200">{program.ageRange}</p>
                    </div>
                  </div>

                  <div className={`flex flex-col p-6 sm:p-7 ${isPathfinders ? "lg:justify-center lg:p-9" : ""}`}>
                    <p className="text-sm leading-6 text-slate-600">{program.description}</p>
                    <div className="mt-5 rounded-2xl border border-[#D9BD78]/40 bg-[#FBF8F0] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#8A6B2B]">Propósito</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-[#18294B]">{program.philosophy}</p>
                    </div>
                    <div className="mt-5">
                      <h4 className="text-sm font-semibold">Áreas e experiências</h4>
                      <ul className="mt-3 space-y-2.5">
                        {details.outcomes.map((outcome) => (
                          <li key={outcome} className="flex items-start gap-2.5 text-sm leading-5 text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B9974D]" />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      <a href={program.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172D59]">
                        Recursos oficiais <span aria-hidden="true" className="ml-2">↗</span>
                      </a>
                      {catalogEntry && <a href={catalogEntry.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] transition hover:border-[#B9974D]">Perfil ministerial</a>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <YouthClubOperations />

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Próxima camada operacional</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Do perfil à gestão real do clube</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Esta página apresenta informação ministerial sem inventar estatísticas. A gestão de membros, dirigentes, classes, especialidades, atividades, investiduras e relatórios deverá ser ligada à API e à base de dados antes de apresentar números operacionais.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
