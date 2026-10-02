"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import MinistryDashboard from "./MinistryDashboard";
import type { Ministry } from "./types";

export default function MinistryLivePage({ ministryId }: { ministryId: string }) {
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resaRequest<Ministry>(`/v1/ministries/${ministryId}`)
      .then(setMinistry)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o ministério."));
  }, [ministryId]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!ministry) return <div className="rounded-2xl border bg-white p-6 text-slate-500">A carregar o ministério…</div>;
  return <MinistryDashboard ministry={ministry} />;
}
