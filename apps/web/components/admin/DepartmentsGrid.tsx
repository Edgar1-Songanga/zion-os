"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Unit = { id: string; name: string; unit_type: string; description: string | null; is_active: boolean };

export default function DepartmentsGrid() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState("A carregar departamentos…");

  useEffect(() => {
    resaRequest<Organization[]>("/v1/organizations")
      .then(async (organizations) => {
        const first = organizations[0];
        if (!first) { setMessage("Nenhuma organização administrada foi encontrada."); return; }
        const result = await resaRequest<Unit[]>(`/v1/organizations/${first.id}/units`);
        setUnits(result);
        setMessage(result.length ? "" : "Nenhum departamento registado nesta organização.");
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os departamentos."));
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-[#0C1A3D]">Departamentos e unidades</h2>
      <p className="mt-2 text-slate-500">Unidades institucionais ligadas à sua organização.</p>
      {!units.length && <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-500">{message}</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {units.map((unit) => (
          <article key={unit.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{unit.unit_type}</p>
            <h3 className="mt-2 font-semibold text-[#0C1A3D]">{unit.name}</h3>
            <p className="mt-3 text-sm text-slate-500">{unit.description || "Sem descrição"}</p>
            <p className="mt-5 text-sm font-semibold text-emerald-700">{unit.is_active ? "Ativo" : "Inativo"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
