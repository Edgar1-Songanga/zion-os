"use client";

import { useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import DepartmentOperationsPanel from "@/components/ministry/DepartmentOperationsPanel";
import type { Ministry } from "@/components/ministry/types";

export default function StewardshipArea() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;
    void resaRequest<Ministry[]>("/v1/ministries/my-assignments/stewardship")
      .then((rows) => {
        if (!active) return;
        const assigned = (rows ?? []);
        setMinistries(assigned);
        setSelectedId(assigned[0]?.id ?? "");
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a área de Mordomia.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => ministries.find((item) => item.id === selectedId) ?? null, [ministries, selectedId]);

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-7 text-[#0C1A3D] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E2C477]">ZION OS · Área departamental</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Mordomia Cristã</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Acesso limitado às atribuições de Mordomia Cristã confirmadas para a tua conta. Esta área não apresenta registos de dízimos, ofertas, doadores ou operações da Tesouraria.
          </p>
        </header>

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A verificar as atribuições departamentais…</div>}
        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>}
        {!loading && !error && ministries.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-950">Nenhuma atribuição de Mordomia confirmada</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">A função de acesso, por si só, não concede acesso aos dados do departamento. Um administrador da organização deve associar a tua conta ao ministério de Mordomia e confirmar essa atribuição.</p>
          </div>
        )}
        {ministries.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {ministries.map((ministry) => (
              <button key={ministry.id} type="button" onClick={() => setSelectedId(ministry.id)} className={selectedId === ministry.id ? "rounded-full bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white" : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"}>
                {ministry.organization?.church ?? ministry.name}
              </button>
            ))}
          </div>
        )}
        {selected && selected.organizationId && (
          <DepartmentOperationsPanel ministry={selected} organizationId={selected.organizationId} />
        )}
      </div>
    </main>
  );
}
