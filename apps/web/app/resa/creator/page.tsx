"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Schedule = {
  id: string;
  scheduled_for: string;
  status: "scheduled" | "published" | "cancelled" | "failed";
  publish_visibility?: string;
  failure_reason?: string | null;
  resa_contents?: { title?: string | null; body?: string | null } | null;
};

function localDateTimeMinimum() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export default function CreatorStudioPage() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await resaRequest<Schedule[]>("/v1/resa/creator/schedules"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o Creator Studio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function schedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() && !body.trim()) {
      setError("Escreva um título ou o conteúdo da publicação.");
      return;
    }
    if (!scheduledFor || new Date(scheduledFor).getTime() <= Date.now()) {
      setError("Escolha uma data e hora futuras.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await resaRequest("/v1/resa/creator/schedules", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          type: "text",
          publish_visibility: visibility,
          language: "pt",
          scheduled_for: new Date(scheduledFor).toISOString(),
        }),
      });
      setTitle("");
      setBody("");
      setScheduledFor("");
      setVisibility("public");
      setNotice("Publicação guardada e agendada. Será publicada automaticamente na hora definida.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível agendar a publicação.");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await resaRequest("/v1/resa/creator/schedules/" + id, { method: "DELETE" });
      setNotice("Agendamento cancelado. O conteúdo permanece privado como rascunho.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar o agendamento.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] bg-[#0C1A3D] p-7 text-white shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">RESA · Creator Studio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Planeie a sua presença.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Prepare publicações, escolha quem as pode ver e programe a sua publicação. O RESA mantém o conteúdo privado até à hora agendada.</p>
        </header>

        <section className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nova publicação</p>
              <h2 className="mt-1 text-xl font-semibold text-[#0C1A3D]">Agendar conteúdo</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Publicação automática</span>
          </div>
          <form onSubmit={schedule} className="mt-6 space-y-4">
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={180} placeholder="Título (opcional)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0C1A3D]/40" />
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={10000} rows={5} placeholder="Escreva a mensagem, reflexão ou conteúdo que pretende publicar…" className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#0C1A3D]/40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-600">Data e hora de publicação</span>
                <input required type="datetime-local" min={localDateTimeMinimum()} value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-600">Quem pode ver</span>
                <select value={visibility} onChange={e => setVisibility(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <option value="public">Público</option>
                  <option value="followers">Seguidores</option>
                  <option value="community">Comunidade</option>
                  <option value="organization">Organização</option>
                </select>
              </label>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="rounded-xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172b55] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "A agendar…" : "Agendar publicação"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Planeamento</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#0C1A3D]">As suas publicações</h2>
            </div>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar</button>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">A carregar agendamentos…</div> :
              items.length ? items.map(item => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#0C1A3D]">{item.resa_contents?.title || item.resa_contents?.body?.slice(0, 100) || "Publicação RESA"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{new Date(item.scheduled_for).toLocaleString("pt-PT")}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{item.status === "scheduled" ? "Agendada" : item.status === "published" ? "Publicada" : item.status === "cancelled" ? "Cancelada" : "Falhou"}</span>
                        <span className="text-slate-400">Visibilidade: {item.publish_visibility || "Público"}</span>
                      </div>
                      {item.failure_reason && <p className="mt-2 text-xs text-red-600">{item.failure_reason}</p>}
                    </div>
                    {item.status === "scheduled" && <button type="button" disabled={busyId === item.id} onClick={() => void cancel(item.id)} className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">{busyId === item.id ? "A cancelar…" : "Cancelar"}</button>}
                  </div>
                </article>
              )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Ainda não tem publicações agendadas.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
