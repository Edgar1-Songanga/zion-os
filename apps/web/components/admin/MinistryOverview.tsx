"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Ministry = {
  id: string;
  name: string;
  department: string;
  description: string;
  philosophy: string;
  status: string;
  metrics: { members: number; leaders: number; programs: number };
};
type Organization = { id: string };

export default function MinistryOverview() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [message, setMessage] = useState("A carregar ministérios…");

  useEffect(() => {
    resaRequest<Organization[]>("/v1/organizations")
      .then(async (organizations) => {
        const first = organizations[0];
        if (!first) { setMessage("Nenhuma organização administrada foi encontrada."); return; }
        const result = await resaRequest<Ministry[]>(`/v1/ministries/organization/${first.id}`);
        setMinistries(result);
        setMessage(result.length ? "" : "Nenhum ministério registado nesta organização.");
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os ministérios."));
  }, []);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-[#0C1A3D]">Centro de ministérios</h2>
      <p className="mt-2 max-w-3xl text-slate-500">Gestão operacional dos ministérios, liderança e programas.</p>
      {!ministries.length && <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-500">{message}</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
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
              <span><strong>{ministry.metrics.members}</strong> membros</span>
              <span><strong>{ministry.metrics.leaders}</strong> líderes</span>
              <span><strong>{ministry.metrics.programs}</strong> programas</span>
            </div>
            <Link href={`/ministry?id=${ministry.id}`} className="mt-6 inline-flex text-sm font-semibold text-[#D4AF37] hover:underline">Abrir centro do ministério →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
