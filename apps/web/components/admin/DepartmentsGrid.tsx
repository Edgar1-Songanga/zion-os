"use client";

import { useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Unit = { id: string; parent_id: string | null; name: string; unit_type: string; description: string | null; is_active: boolean };

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800";

export default function DepartmentsGrid() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [message, setMessage] = useState("A carregar organizações…");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshUnits = async (id: string, selectId?: string) => {
    const result = await resaRequest<Unit[]>(`/v1/organizations/${encodeURIComponent(id)}/units`);
    const ordered = [...result].sort((a, b) => a.name.localeCompare(b.name));
    setUnits(ordered);
    setSelectedUnitId(selectId ?? ordered[0]?.id ?? "");
  };

  useEffect(() => {
    let active = true;
    resaRequest<Organization[]>("/v1/organizations")
      .then((result) => {
        if (!active) return;
        setOrganizations(result);
        if (result[0]) setOrganizationId(result[0].id);
        else setMessage("Crie uma organização antes de registar departamentos.");
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."));
    return () => { active = false; };
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
      .catch((reason: unknown) => { if (active) setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os departamentos."); });
    return () => { active = false; };
  }, [organizationId]);

  async function createUnit(event: React.FormEvent) {
    event.preventDefault();
    const unitName = name.trim();
    if (!organizationId || !unitName || creating) return;
    if (units.some((unit) => unit.name.toLocaleLowerCase() === unitName.toLocaleLowerCase())) {
      setMessage(`“${unitName}” já existe nesta organização.`);
      return;
    }
    setCreating(true); setMessage("");
    try {
      const created = await resaRequest<Unit>(`/v1/organizations/${encodeURIComponent(organizationId)}/units`, {
        method: "POST",
        body: JSON.stringify({ name: unitName, description: description.trim() || null, parent_id: parentId || null, unit_type: parentId ? "SUBDEPARTMENT" : "DEPARTMENT" }),
      });
      await refreshUnits(organizationId, created.id);
      setName(""); setDescription(""); setParentId("");
      setMessage(`“${created.name}” foi criado.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível criar o departamento.");
    } finally { setCreating(false); }
  }

  async function toggleActive(unit: Unit) {
    if (!organizationId || saving) return;
    setSaving(true); setMessage("");
    try {
      await resaRequest<Unit>(`/v1/organizations/${encodeURIComponent(organizationId)}/units/${encodeURIComponent(unit.id)}`, {
        method: "PATCH", body: JSON.stringify({ is_active: !unit.is_active }),
      });
      await refreshUnits(organizationId, unit.id);
      setMessage(unit.is_active ? "Departamento desativado. O histórico foi preservado." : "Departamento ativado.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível alterar o estado.");
    } finally { setSaving(false); }
  }

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
  const parentOptions = useMemo(() => units.filter((unit) => unit.is_active && unit.id !== selectedUnitId), [units, selectedUnitId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0C1A3D]">Departamentos e unidades</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Ative apenas os departamentos que esta organização realmente utiliza. Pode criar subdepartamentos e desativar unidades sem apagar o histórico.</p>
        </div>
        {organizations.length > 0 && <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">Igreja / organização
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={inputClass}>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>}
      </div>

      {organizations.length > 0 && <form className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2" onSubmit={createUnit}>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Nome
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="Nome do departamento" className={inputClass} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Departamento principal
          <select value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}>
            <option value="">Sem departamento principal</option>
            {parentOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Descrição (opcional)
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Finalidade ou âmbito desta unidade" className={inputClass} />
        </label>
        <div className="sm:col-span-2"><button type="submit" disabled={!name.trim() || creating} className="rounded-lg bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{creating ? "A criar…" : "Criar departamento"}</button></div>
      </form>}

      {units.length > 0 && <div className="mt-5 max-w-xl">
        <label htmlFor="department-picker" className="mb-1.5 block text-xs font-semibold text-slate-600">Unidade ({units.length})</label>
        <select id="department-picker" value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className={inputClass}>
          {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.parent_id ? "↳ " : ""}{unit.name} · {unit.is_active ? "Ativo" : "Inativo"}</option>)}
        </select>
      </div>}

      {selectedUnit && <article className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-[#0C1A3D]">{selectedUnit.name}</h3><p className="mt-1 text-xs text-slate-500">{selectedUnit.unit_type}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedUnit.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{selectedUnit.is_active ? "Ativo" : "Inativo"}</span>
        </div>
        {selectedUnit.description && <p className="mt-3 text-sm leading-5 text-slate-600">{selectedUnit.description}</p>}
        <button type="button" disabled={saving} onClick={() => void toggleActive(selectedUnit)} className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{saving ? "A guardar…" : selectedUnit.is_active ? "Desativar departamento" : "Ativar departamento"}</button>
      </article>}

      {message && <p aria-live="polite" className="mt-4 text-sm text-slate-500">{message}</p>}
    </section>
  );
}
