"use client";

import { useEffect, useRef, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export type ZionOrganization = { id: string; name: string; organization_type: string; parent_id: string | null };

export function OrganizationSelector({ value, onChange }: { value: string; onChange: (id: string, organization: ZionOrganization) => void }) {
  const [organizations, setOrganizations] = useState<ZionOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    void resaRequest<ZionOrganization[]>("/v1/organizations")
      .then((items) => {
        setOrganizations(items);
        if (!value && items[0]) onChangeRef.current(items[0].id, items[0]);
      })
      .finally(() => setLoading(false));
  }, [value]);

  return (
    <label className="flex min-w-[260px] flex-col gap-1 text-xs font-medium text-slate-500">
      Organização
      <select value={value} disabled={loading || organizations.length === 0}
        onChange={(event) => { const selected = organizations.find((item) => item.id === event.target.value); if (selected) onChangeRef.current(selected.id, selected); }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[var(--zion-gold)]">
        {organizations.length === 0 && <option value="">Nenhuma organização disponível</option>}
        {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.organization_type}</option>)}
      </select>
    </label>
  );
}