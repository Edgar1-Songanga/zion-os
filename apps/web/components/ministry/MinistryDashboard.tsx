"use client";

import Card from "../ui/Card";
import StatCard from "../ui/StatCard";
import { getMinistryCatalogEntry } from "./ministry-catalog";
import type { Ministry } from "./types";

interface MinistryDashboardProps {
  ministry: Ministry;
}

export default function MinistryDashboard({ ministry }: MinistryDashboardProps) {
  const catalogEntry = getMinistryCatalogEntry(ministry.department) ?? getMinistryCatalogEntry(ministry.name);
  const mission = catalogEntry?.mission ?? ministry.philosophy;
  const focusAreas = catalogEntry?.focusAreas ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          {catalogEntry && (
            <div className="relative h-56 sm:h-72">
              <img src={catalogEntry.coverImage} alt={`Fotografia ilustrativa: ${ministry.name}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071126]/90 via-[#071126]/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E2C477]">{catalogEntry.category}</p>
                <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{ministry.name}</h1>
                {catalogEntry.ageRange && <p className="mt-2 text-sm text-slate-200">{catalogEntry.ageRange}</p>}
              </div>
            </div>
          )}
          <div className="space-y-5 p-5 sm:p-7">
            {!catalogEntry && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B18B36]">{ministry.department}</p>
                <h1 className="text-3xl font-semibold text-[#0C1A3D] sm:text-4xl">{ministry.name}</h1>
              </>
            )}
            <p className="max-w-4xl text-base leading-7 text-slate-600">
              {catalogEntry?.summary || ministry.description || "A descrição deste ministério ainda não foi preenchida."}
            </p>
            {mission && (
              <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F16]">Missão e propósito</p>
                <p className="mt-2 text-base font-medium leading-7 text-[#0C1A3D]">{mission}</p>
              </div>
            )}
            {focusAreas.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[#0C1A3D]">Áreas de atuação</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {focusAreas.map((focus) => <span key={focus} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{focus}</span>)}
                </div>
              </div>
            )}
            {catalogEntry && (
              <a href={catalogEntry.officialUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-[#0C1A3D] underline decoration-[#C8A24A] underline-offset-4">
                Consultar referência oficial: {catalogEntry.sourceLabel}
              </a>
            )}
            <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div><p className="text-xs text-slate-400">Igreja / organização</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.church ?? "Não definida"}</p></div>
              <div><p className="text-xs text-slate-400">Distrito</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.district ?? "Não definido"}</p></div>
              <div><p className="text-xs text-slate-400">Conferência</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.conference ?? "Não definida"}</p></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Membros" value={String(ministry.metrics?.members ?? 0)} description="Membros registados" />
        <StatCard label="Dirigentes" value={String(ministry.metrics?.leaders ?? 0)} description="Equipa registada" />
        <StatCard label="Programas" value={String(ministry.metrics?.programs ?? ministry.programs?.length ?? 0)} description="Programas registados" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Dirigentes</h2>
          <div className="mt-5 space-y-4">
            {ministry.leadership?.length ? ministry.leadership.map((leader) => (
              <div key={leader.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div><p className="font-medium text-[#0C1A3D]">{leader.name}</p><p className="text-sm text-slate-500">{leader.role}</p></div>
                {leader.verified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Verificado</span>}
              </div>
            )) : <p className="text-sm text-slate-500">Nenhuma liderança registada.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Programas e atividades</h2>
          <div className="mt-5 space-y-4">
            {ministry.programs?.length ? ministry.programs.map((program) => (
              <div key={program.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div><p className="font-medium text-[#0C1A3D]">{program.name}</p>{program.description && <p className="mt-1 text-sm text-slate-500">{program.description}</p>}</div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{program.status}</span>
              </div>
            )) : <p className="text-sm text-slate-500">Nenhum programa registado.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[#0C1A3D]">Relatórios</h2>
        <div className="mt-4 space-y-3">
          {ministry.reports?.length ? ministry.reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <span className="text-sm text-[#0C1A3D]">{report.title}</span>
              <span className="text-xs text-slate-500">{report.status}</span>
            </div>
          )) : <p className="text-sm text-slate-500">Nenhum relatório disponível.</p>}
        </div>
      </Card>
    </div>
  );
}
