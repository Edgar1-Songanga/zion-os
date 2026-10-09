"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";

type Ministry = {
  id: string;
  name: string;
  department: string;
  description: string;
  philosophy: string;
  status: string;
  metrics?: { members: number; leaders: number; programs: number };
};
type Organization = { id: string; name: string };

export default function MinistryOverview() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [message, setMessage] = useState("A carregar ministérios…");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("MINISTRY");
  const [description, setDescription] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    resaRequest<Organization[]>("/v1/organizations")
      .then((result) => {
        setOrganizations(result);
        if (result[0]) setOrganizationId(result[0].id);
        else setMessage("Crie uma organização antes de registar ministérios.");
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    setMinistries([]);
    setMessage("A carregar ministérios…");
    resaRequest<Ministry[]>(`/v1/ministries/organization/${organizationId}`)
      .then((result) => {
        if (!active) return;
        setMinistries(result);
        setMessage(result.length ? "" : "Nenhum ministério registado nesta organização.");
      })
      .catch((reason: unknown) => {
        if (active) setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os ministérios.");
      });
    return () => { active = false; };
  }, [organizationId]);

  async function createMinistry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !name.trim() || creating) return;
    setCreating(true);
    setMessage("");
    try {
      const created = await resaRequest<Ministry>("/v1/ministries", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          name: name.trim(),
          department: department.trim() || "MINISTRY",
          description: description.trim(),
          philosophy: philosophy.trim(),
        }),
      });
      setMinistries((current) => [created, ...current]);
      setName("");
      setDescription("");
      setPhilosophy("");
      setMessage(`Ministério “${created.name}” criado.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível criar o ministério.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#0C1A3D]">Centro de ministérios</h2>
        <p className="mt-2 max-w-3xl text-slate-500">Gestão operacional dos ministérios, liderança e programas.</p>
        {organizations.length > 0 && <label className="mt-4 block text-sm text-slate-600">Organização
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>}
      </div>

      {organizations.length > 0 && <form onSubmit={createMinistry} className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-[#0C1A3D]">Criar ministério</p>
          <p className="mt-1 text-xs text-slate-500">Registe a estrutura; depois poderá associar líderes e programas.</p>
        </div>
        <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do ministério" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <input maxLength={160} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Área (ex.: Juventude)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <textarea maxLength={2000} value={philosophy} onChange={(event) => setPhilosophy(event.target.value)} placeholder="Missão / filosofia" className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <div className="md:col-span-2"><button type="submit" disabled={!name.trim() || creating} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{creating ? "A criar…" : "Criar ministério"}</button></div>
      </form>}

      {message && <p aria-live="polite" className="mb-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{message}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {ministries.map((ministry) => (
          <article key={ministry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{ministry.department}</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{ministry.name}</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700">{ministry.status}</span>
            </div>
            <p className="mt-4 text-sm text-slate-600">{ministry.description}</p>
            <p className="mt-4 rounded-xl bg-[#D4AF37]/10 p-4 text-sm text-[#0C1A3D]"><strong>Filosofia:</strong> {ministry.philosophy}</p>
            <div className="mt-5 flex gap-5 text-sm text-slate-600">
              <span><strong>{ministry.metrics?.members ?? 0}</strong> membros</span>
              <span><strong>{ministry.metrics?.leaders ?? 0}</strong> líderes</span>
              <span><strong>{ministry.metrics?.programs ?? 0}</strong> programas</span>
            </div>
            <Link href={`/ministry?id=${ministry.id}`} className="mt-6 inline-flex text-sm font-semibold text-[#D4AF37] hover:underline">Abrir centro do ministério →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
