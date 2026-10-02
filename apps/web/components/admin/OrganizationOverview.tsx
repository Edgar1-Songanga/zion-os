"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  is_active: boolean;
};

export default function OrganizationOverview() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resaRequest<Organization[]>("/v1/organizations")
      .then(setOrganizations)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."));
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#0C1A3D]">Organizações administradas</h2>
        <p className="mt-2 text-slate-500">Estrutura institucional sob a sua responsabilidade.</p>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {!error && organizations.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-slate-500">Nenhuma organização administrada foi encontrada.</p>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((organization) => (
          <article key={organization.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{organization.organization_type}</p>
            <h3 className="mt-2 text-xl font-bold text-[#0C1A3D]">{organization.name}</h3>
            <p className="mt-2 text-sm text-slate-500">/{organization.slug}</p>
            <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {organization.is_active ? "Ativa" : "Inativa"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
