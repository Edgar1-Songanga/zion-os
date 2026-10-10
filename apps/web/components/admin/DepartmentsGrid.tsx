"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Unit = { id: string; name: string; unit_type: string; description: string | null; is_active: boolean };

export default function DepartmentsGrid() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState("A carregar organizações…");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    resaRequest<Organization[]>("/v1/organizations")
      .then((result) => {
        setOrganizations(result);
        if (result[0]) setOrganizationId(result[0].id);
        else setMessage("Crie uma organização antes de registar departamentos.");
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    setMessage("A carregar departamentos…");
    resaRequest<Unit[]>(`/v1/organizations/${organizationId}/units`)
      .then((result) => {
        if (!active) return;
        setUnits(result);
        setMessage(result.length ? "" : "Ainda não há departamentos nesta organização.");
      })
      .catch((reason: unknown) => {
        if (active) setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os departamentos.");
      });
    return () => { active = false; };
  }, [organizationId]);

  async function createUnit(value: string) {
    const unitName = value.trim();
    if (!organizationId || !unitName || creating) return;
    if (units.some((unit) => unit.name.toLocaleLowerCase() === unitName.toLocaleLowerCase())) {
      setMessage(`“${unitName}” já existe nesta organização.`);
      return;
    }
    setCreating(true);
    setMessage("");
    try {
      const created = await resaRequest<Unit>(`/v1/organizations/${organizationId}/units`, {
        method: "POST",
        body: JSON.stringify({ name: unitName, unit_type: "DEPARTMENT" }),
      });
      setUnits((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setMessage(`Departamento “${created.name}” criado.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível criar o departamento.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0C1A3D]">Departamentos e unidades</h2>
          <p className="mt-2 text-slate-500">Estrutura institucional ligada a cada organização.</p>
        </div>
        {organizations.length > 0 && <label className="text-sm text-slate-600">Organização
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>}
      </div>

      {organizations.length > 0 && <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-[#0C1A3D]">Adicionar departamento</p>
        <form className="mt-3 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); void createUnit(name); }}>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Nome do departamento" className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          <button type="submit" disabled={!name.trim() || creating} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{creating ? "A criar…" : "Criar"}</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={creating} onClick={() => void createUnit("Finanças")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] disabled:opacity-40">+ Finanças</button>
          <button type="button" disabled={creating} onClick={() => void createUnit("Recursos Humanos")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] disabled:opacity-40">+ Recursos Humanos</button>
        </div>
      </div>}

      {message && <p aria-live="polite" className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{message}</p>}
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
