"use client";

import { useEffect, useState } from "react";
import ResaIcon from "@/components/resa/core/ResaIcon";
import { resaRequest } from "@/lib/resa/api";
import LiveStudio from "@/components/resa/live/LiveStudio";

type OrganizationOption = { id: string; name: string };
type UnitOption = { id: string; name: string; unit_type?: string; is_active?: boolean };
type MinistryOption = { id: string; name: string; status?: string };

type LiveSession = {
  id: string;
  title: string;
  description?: string | null;
  status: "scheduled" | "live" | "ended";
  visibility: string;
  scheduled_at?: string | null;
  started_at?: string | null;
  host_id?: string;
  organization_id?: string | null;
  organization_unit_id?: string | null;
  ministry_id?: string | null;
  is_host?: boolean;
};

export default function LivePage() {
  const [items, setItems] = useState<LiveSession[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [visibility, setVisibility] = useState<"public" | "organization">("public");
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitId, setUnitId] = useState("");
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [ministryId, setMinistryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioLive, setStudioLive] = useState<LiveSession | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await resaRequest<LiveSession[]>("/v1/resa/live?limit=30"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as Lives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void resaRequest<OrganizationOption[]>("/v1/organizations")
      .then((rows) => setOrganizations(rows.filter((row) => row && row.id && row.name)))
      .catch(() => setOrganizations([]));
  }, []);

  useEffect(() => {
    setUnitId("");
    setMinistryId("");
    if (!organizationId) { setUnits([]); setMinistries([]); return; }
    let cancelled = false;
    resaRequest<UnitOption[]>(`/v1/organizations/${organizationId}/units`)
      .then((rows) => { if (!cancelled) setUnits(rows.filter((row) => row && row.id && row.name && row.is_active !== false)); })
      .catch(() => { if (!cancelled) setUnits([]); });
    resaRequest<MinistryOption[]>(`/v1/ministries/organization/${organizationId}`)
      .then((rows) => { if (!cancelled) setMinistries(rows.filter((row) => row && row.id && row.name && (!row.status || row.status.toUpperCase() === "ACTIVE"))); })
      .catch(() => { if (!cancelled) setMinistries([]); });
    return () => { cancelled = true; };
  }, [organizationId]);

  async function createLive(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await resaRequest<LiveSession>("/v1/resa/live", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          visibility,
          organization_id: organizationId || null,
          organization_unit_id: unitId || null,
          ministry_id: ministryId || null,
        }),
      });
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setVisibility("public");
      setOrganizationId("");
      setUnitId("");
      setMinistryId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a Live.");
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(id: string, status: "live" | "ended") {
    try {
      await resaRequest("/v1/resa/live/" + id + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const latest = items.find((item) => item.id === id);
      await load();
      if (status === "live" && latest) setStudioLive({ ...latest, status: "live", is_host: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a Live.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[28px] bg-[#08152f] p-6 text-white shadow-[0_20px_60px_rgba(8,21,47,0.16)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <ResaIcon name="live" size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Transmissão social</p>
                  <h1 className="text-3xl font-semibold tracking-tight">Lives</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Crie e acompanhe transmissões do RESA com áudio e vídeo em tempo real. O estúdio suporta gravação local no dispositivo e pode encaminhar a live para plataformas externas quando o LiveKit Egress estiver configurado.
              </p>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={createLive} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0C1A3D]">Criar uma Live</h2>
            <p className="mt-1 text-sm text-slate-500">Transmissões públicas ou restritas à organização, com ligação opcional a um departamento.</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="Título da transmissão" className="mt-5 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0C1A3D]" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Descrição (opcional)" className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0C1A3D]" />
            <label className="mt-3 block text-sm font-medium text-slate-600">Visibilidade<select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "organization")} className="mt-1 w-full rounded-xl border border-slate-200 p-3"><option value="public">Pública</option><option value="organization" disabled={!organizationId}>Membros da organização</option></select></label>
            <label className="mt-3 block text-sm font-medium text-slate-600">Organização<select value={organizationId} onChange={(e) => { setOrganizationId(e.target.value); if (!e.target.value) setVisibility("public"); }} className="mt-1 w-full rounded-xl border border-slate-200 p-3"><option value="">Sem organização</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
            <label className="mt-3 block text-sm font-medium text-slate-600">Departamento<select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!organizationId || !units.length} className="mt-1 w-full rounded-xl border border-slate-200 p-3"><option value="">Toda a organização</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="mt-3 block text-sm font-medium text-slate-600">Ministério<select value={ministryId} onChange={(e) => setMinistryId(e.target.value)} disabled={!organizationId || !ministries.length} className="mt-1 w-full rounded-xl border border-slate-200 p-3"><option value="">Sem ministério específico</option>{ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}</select></label>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Agendar
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3" />
            </label>
            <button disabled={creating} className="mt-4 w-full rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {creating ? "A criar..." : "Criar Live"}
            </button>
          </form>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0C1A3D]">Sessões disponíveis</h2>
              <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                {loading ? "A atualizar..." : "Atualizar"}
              </button>
            </div>

            {loading && !items.length ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">A carregar Lives...</div>
            ) : items.length ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={item.status === "live" ? "h-2.5 w-2.5 rounded-full bg-red-500" : "h-2.5 w-2.5 rounded-full bg-slate-300"} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.status}</span>
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{item.title}</h3>
                        {(item.visibility === "organization" || item.organization_id || item.organization_unit_id || item.ministry_id) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.visibility === "organization" && <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Restrita à organização</span>}
                            {item.organization_unit_id && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">Departamento associado</span>}
                            {item.ministry_id && <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Ministério associado</span>}
                          </div>
                        )}
                        {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                        {item.scheduled_at && <p className="mt-3 text-sm text-slate-500">Agendada para {new Date(item.scheduled_at).toLocaleString("pt-PT")}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.status === "scheduled" && item.is_host && <button onClick={() => void setStatus(item.id, "live")} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white">Iniciar live</button>}
                        {item.status === "live" && item.is_host && <button onClick={() => setStudioLive(item)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Abrir Studio</button>}
                        {item.status === "live" && !item.is_host && <button onClick={() => setStudioLive(item)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Entrar na live</button>}
                        {item.status === "scheduled" && !item.is_host && <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">Agendada</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-semibold text-[#0C1A3D]">Nenhuma Live disponível</p>
                <p className="mt-2 text-sm text-slate-500">As sessões reais criadas pela comunidade aparecerão aqui.</p>
              </div>
            )}
          </section>
        </div>
      </div>
      {studioLive && <LiveStudio liveId={studioLive.id} title={studioLive.title} onClose={() => setStudioLive(null)} />}
    </main>
  );
}
