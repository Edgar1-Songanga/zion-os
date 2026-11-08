"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";

type CommunityOption = { id: string; name: string; membership_status?: string };
type OrganizationOption = { id: string; name: string };
type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  meeting_url?: string | null;
  visibility: string;
  status?: string;
  is_creator?: boolean;
  my_response?: "interested" | "going" | "declined" | null;
};

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers" | "community" | "organization">("public");
  const [communityId, setCommunityId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await resaRequest<EventItem[]>("/v1/resa/events?limit=60"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void resaRequest<CommunityOption[]>("/v1/resa/communities?limit=100")
      .then(rows => setCommunities(rows.filter(row => row && row.id && row.name && ["active", "owner"].includes(row.membership_status || ""))))
      .catch(() => setCommunities([]));
    void resaRequest<OrganizationOption[]>("/v1/organizations")
      .then(rows => setOrganizations(rows.filter(row => row && row.id && row.name)))
      .catch(() => setOrganizations([]));
  }, [load]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length < 2) {
      setError("O título deve ter pelo menos dois caracteres.");
      return;
    }
    if (!startsAt || new Date(startsAt).getTime() <= Date.now()) {
      setError("Escolha uma data e hora futuras.");
      return;
    }
    if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError("A hora de fim deve ser posterior à hora de início.");
      return;
    }
    if (visibility === "community" && !communityId) {
      setError("Selecione a comunidade onde o evento será realizado.");
      return;
    }
    if (visibility === "organization" && !organizationId) {
      setError("Selecione a organização responsável pelo evento.");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await resaRequest("/v1/resa/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          location: location.trim() || null,
          meeting_url: meetingUrl.trim() || null,
          visibility,
          community_id: visibility === "community" ? communityId : null,
          organization_id: visibility === "organization" ? organizationId : null,
        }),
      });
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      setMeetingUrl("");
      setVisibility("public");
      setCommunityId("");
      setOrganizationId("");
      setNotice("Evento criado e publicado na agenda da comunidade.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o evento.");
    } finally {
      setCreating(false);
    }
  }

  async function respond(id: string, response: "interested" | "going" | "declined") {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await resaRequest("/v1/resa/events/" + id + "/respond", {
        method: "POST",
        body: JSON.stringify({ response }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a sua participação.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelEvent(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await resaRequest("/v1/resa/events/" + id + "/cancel", { method: "PATCH" });
      setNotice("Evento cancelado. Os participantes deixarão de o ver na agenda.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar o evento.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-[#0C1A3D] p-7 text-white shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Eventos</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A agenda da sua comunidade.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Descubra eventos reais, crie encontros, confirme presença e entre diretamente em reuniões online quando disponíveis.</p>
        </header>

        <section className="mt-7 rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Organização</p>
          <h2 className="mt-1 text-xl font-semibold text-[#0C1A3D]">Criar evento</h2>
          <form onSubmit={createEvent} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2"><span className="mb-2 block text-xs font-semibold text-slate-600">Título</span><input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do evento" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block md:col-span-2"><span className="mb-2 block text-xs font-semibold text-slate-600">Descrição</span><textarea maxLength={5000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="O que vai acontecer?" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Início</span><input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Fim (opcional)</span><input type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={e => setEndsAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Local (opcional)</span><input maxLength={240} value={location} onChange={e => setLocation(e.target.value)} placeholder="Local ou endereço" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Ligação da reunião (opcional)</span><input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Audiência</span><select value={visibility} onChange={e => { setVisibility(e.target.value as typeof visibility); setCommunityId(""); setOrganizationId(""); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option value="public">Público</option><option value="followers">Seguidores</option><option value="community" disabled={!communities.length}>Comunidade</option><option value="organization" disabled={!organizations.length}>Organização</option></select></label>
            {visibility === "community" && <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Comunidade</span><select required value={communityId} onChange={e => setCommunityId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option value="">Selecione uma comunidade</option>{communities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {visibility === "organization" && <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Organização</span><select required value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option value="">Selecione uma organização</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <div className="flex items-center justify-end md:col-span-2"><button type="submit" disabled={creating} className="rounded-xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{creating ? "A criar…" : "Publicar evento"}</button></div>
          </form>
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

        <section className="mt-8 space-y-4">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Agenda</p><h2 className="mt-1 text-2xl font-semibold text-[#0C1A3D]">Eventos disponíveis</h2></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{loading ? "A atualizar…" : "Atualizar"}</button></div>
          {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-[1.75rem] border bg-white" />) :
            items.length ? items.map(item => (
              <article key={item.id} className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{new Date(item.starts_at).toLocaleDateString("pt-PT", {day:"2-digit", month:"long", year:"numeric"})}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-500">{item.visibility}</span>{item.is_creator && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Criado por si</span>}</div>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description || "Evento da rede RESA."}</p>
                    <p className="mt-3 text-sm font-medium text-slate-500">{new Date(item.starts_at).toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"})}{item.location ? " · " + item.location : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busyId===item.id} onClick={() => void respond(item.id, "interested")} className={item.my_response==="interested" ? "rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800" : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"}>Interesse</button>
                    <button disabled={busyId===item.id} onClick={() => void respond(item.id, "going")} className={item.my_response==="going" ? "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white" : "rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white"}>Vou</button>
                    <button disabled={busyId===item.id} onClick={() => void respond(item.id, "declined")} className={item.my_response==="declined" ? "rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700" : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500"}>Não vou</button>
                    {item.meeting_url && <a className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#0C1A3D]" href={item.meeting_url} target="_blank" rel="noreferrer">Abrir reunião</a>}
                    {item.is_creator && <button disabled={busyId===item.id} onClick={() => void cancelEvent(item.id)} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">{busyId===item.id ? "A atualizar…" : "Cancelar evento"}</button>}
                  </div>
                </div>
              </article>
            )) : <div className="rounded-[1.75rem] border border-dashed bg-white p-12 text-center text-slate-500">Não existem eventos disponíveis neste momento.</div>}
        </section>
      </div>
    </main>
  );
}
