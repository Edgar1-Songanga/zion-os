"use client";

import { useState } from "react";
import Link from "next/link";
import { YOUTH_PROGRAMS, type YouthProgram } from "@/components/youth/core/YouthProgram";
import { getMinistryCatalogEntry } from "@/components/ministry/ministry-catalog";
import YouthClubOperations from "./YouthClubOperations";
import YouthProgressionOperations from "./YouthProgressionOperations";
import YouthActivityOperations from "./YouthActivityOperations";

const CATALOG_ID_BY_PROGRAM: Record<string, string> = {
  adventurers: "adventurer-club",
  pathfinders: "pathfinder-club",
  ambassadors: "ambassadors",
  "young-adults": "young-adults",
  "public-campus-ministries": "public-campus-ministries",
};

const PROGRAM_DETAILS: Record<string, { eyebrow: string; outcomes: string[]; workstreams: string[] }> = {
  adventurers: {
    eyebrow: "INFÂNCIA E FAMÍLIA",
    outcomes: ["Classes e experiências por idade", "Participação ativa da família", "Descoberta, fé e serviço"],
    workstreams: ["Gestão do clube e das unidades", "Classes e acompanhamento da aprendizagem", "Atividades com participação familiar", "Registo de participação e progresso"],
  },
  pathfinders: {
    eyebrow: "FORMAÇÃO E AVENTURA",
    outcomes: ["Classes progressivas", "Especialidades e competências práticas", "Acampamentos, liderança e serviço", "Registos de progresso e investiduras"],
    workstreams: ["Gestão do clube, unidades e dirigentes", "Classes progressivas e especialidades", "Aulas, tarefas e evidências de aprendizagem", "Validação de requisitos e investiduras", "Acampamentos, atividades e serviço comunitário"],
  },
  ambassadors: {
    eyebrow: "LIDERANÇA JOVEM",
    outcomes: ["Discipulado e mentoria", "Liderança e missão", "Serviço e desenvolvimento de competências"],
    workstreams: ["Gestão do grupo e dos participantes", "Formação de liderança e discipulado", "Mentoria e planos de desenvolvimento", "Projetos missionários e serviço", "Atividades e relatórios"],
  },
  "young-adults": {
    eyebrow: "VIDA ADULTA E MISSÃO",
    outcomes: ["Comunidade e crescimento espiritual", "Vocação, mentoria e liderança", "Missão e serviço"],
    workstreams: ["Comunidade e pequenos grupos", "Discipulado e crescimento espiritual", "Mentoria, vocação e liderança", "Projetos de missão e serviço", "Atividades e acompanhamento"],
  },
  "public-campus-ministries": {
    eyebrow: "UNIVERSIDADE E CAMPUS",
    outcomes: ["Grupos e discipulado no campus", "Liderança estudantil", "Apoio à comunidade académica", "Missão em ambientes universitários"],
    workstreams: ["Gestão de grupos de campus", "Formação e discipulado de estudantes", "Liderança estudantil e mentoria", "Iniciativas para a comunidade académica", "Calendário de atividades e relatórios"],
  },
};

function ProgramProfile({ program, onClose }: { program: YouthProgram; onClose: () => void }) {
  const details = PROGRAM_DETAILS[program.id];
  return (
    <section id="program-profile" aria-labelledby="program-profile-title" className="mt-8 scroll-mt-6 overflow-hidden rounded-3xl border border-[#D9BD78]/50 bg-white shadow-lg">
      <div className="bg-[#071126] px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BD78]">Perfil do programa · ZION OS</p>
            <h2 id="program-profile-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{program.name}</h2>
            <p className="mt-2 text-sm text-slate-300">{program.ageRange}</p>
          </div>
          <button type="button" onClick={onClose} className="w-fit rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Fechar perfil
          </button>
        </div>
        <p className="mt-6 max-w-3xl text-base leading-7 text-slate-200">{program.description}</p>
        <div className="mt-5 rounded-2xl border border-[#D9BD78]/30 bg-white/[0.06] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D9BD78]">Propósito</p>
          <p className="mt-2 text-sm leading-6 text-white">{program.philosophy}</p>
        </div>
      </div>
      <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-[#0C1A3D]">Áreas de atuação</h3>
          <ul className="mt-4 space-y-3">
            {details.outcomes.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#B9974D]" />{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#0C1A3D]">Áreas de gestão no ZION OS</h3>
          <ul className="mt-4 space-y-3">
            {details.workstreams.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />{item}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            Este perfil é apresentado dentro da plataforma. A disponibilidade operacional de cada fluxo depende da ligação real à API e das permissões da organização; esta descrição não substitui a validação funcional.
          </p>
          <a href={program.officialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center rounded-full border border-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] transition hover:bg-slate-50">
            Consultar referência oficial <span aria-hidden="true" className="ml-2">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function YouthMinistryHub() {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const selectedProgram = YOUTH_PROGRAMS.find((program) => program.id === selectedProgramId) ?? null;

  function openProgramProfile(programId: string) {
    setSelectedProgramId(programId);
    window.setTimeout(() => document.getElementById("program-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

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
                Gestão ministerial, formação, progressão e serviço num único espaço digital, com áreas adequadas a cada fase da jornada jovem.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-medium text-white">Programas no ecossistema</p>
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Explore cada programa</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Abra os perfis dentro do ZION OS. As referências oficiais são complementares e não substituem a experiência interna da plataforma.</p>
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
            const isSelected = selectedProgramId === program.id;

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
                      <button type="button" aria-expanded={isSelected} aria-controls="program-profile" onClick={() => openProgramProfile(program.id)} className="inline-flex items-center rounded-full bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172D59]">
                        {isSelected ? "Perfil aberto" : "Abrir perfil no ZION"} <span aria-hidden="true" className="ml-2">→</span>
                      </button>
                      <a href={program.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] transition hover:border-[#B9974D]">
                        Fonte oficial <span aria-hidden="true" className="ml-2">↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {selectedProgram && <ProgramProfile program={selectedProgram} onClose={() => setSelectedProgramId(null)} />}

        <div id="youth-club-management" className="scroll-mt-6">
          <YouthClubOperations />
        </div>
        <div id="youth-learning-and-progression" className="scroll-mt-6">
          <YouthProgressionOperations />
        </div>
        <div id="youth-activities" className="scroll-mt-6">
          <YouthActivityOperations />
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Gestão integrada</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Clubes, formação e atividades no mesmo espaço</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">O painel reúne os módulos existentes de clubes, progressão e atividades. A conclusão do subsistema exige validar cada operação contra a API e a base de dados reais, verificar permissões e integrar uma experiência de aprendizagem completa, sem apresentar fluxos ainda não validados como concluídos.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
