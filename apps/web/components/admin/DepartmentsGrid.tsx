"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Unit = { id: string; name: string; unit_type: string; description: string | null; is_active: boolean };

export default function DepartmentsGrid() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
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
    setUnits([]);
    setSelectedUnitId("");
    setMessage("A carregar departamentos…");
    resaRequest<Unit[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/units`)
      .then((result) => {
        if (!active) return;
        const ordered = [...result].sort((a, b) => a.name.localeCompare(b.name));
        setUnits(ordered);
        setSelectedUnitId(ordered[0]?.id ?? "");
        setMessage(ordered.length ? "" : "Ainda não há departamentos nesta organização.");
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
      const created = await resaRequest<Unit>(`/v1/organizations/${encodeURIComponent(organizationId)}/units`, {
        method: "POST",
        body: JSON.stringify({ name: unitName, unit_type: "DEPARTMENT" }),
      });
      setUnits((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedUnitId(created.id);
      setName("");
      setMessage(`Departamento “${created.name}” criado.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível criar o departamento.");
    } finally {
      setCreating(false);
    }
  }

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0C1A3D]">Departamentos</h2>
          <p className="mt-1 text-sm text-slate-500">Escolha um departamento para consultar os seus detalhes.</p>
        </div>
        {organizations.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Igreja / organização
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {organizations.length > 0 && (
        <form className="mt-5 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void createUnit(name); }}>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Nome do novo departamento" aria-label="Nome do novo departamento" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          <button type="submit" disabled={!name.trim() || creating} className="rounded-lg bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{creating ? "A criar…" : "Adicionar"}</button>
        </form>
      )}

      {units.length > 0 && (
        <div className="mt-5 max-w-xl">
          <label htmlFor="department-picker" className="mb-1.5 block text-xs font-semibold text-slate-600">Departamento ({units.length})</label>
          <select id="department-picker" value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-[#0C1A3D] outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20">
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </div>
      )}

      {selectedUnit && (
        <article className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#0C1A3D]">{selectedUnit.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{selectedUnit.unit_type}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${selectedUnit.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{selectedUnit.is_active ? "Ativo" : "Inativo"}</span>
          </div>
          {selectedUnit.description && <p className="mt-3 text-sm leading-5 text-slate-600">{selectedUnit.description}</p>}
        </article>
      )}

      {message && <p aria-live="polite" className="mt-4 text-sm text-slate-500">{message}</p>}
    </section>
  );
}
