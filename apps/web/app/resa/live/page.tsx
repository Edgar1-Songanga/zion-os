"use client";

import { useEffect, useState } from "react";
import ResaIcon from "@/components/resa/core/ResaIcon";
import { resaRequest } from "@/lib/resa/api";
import LiveStudio from "@/components/resa/live/LiveStudio";

type LiveSession = {
  id: string;
  title: string;
  description?: string | null;
  status: "scheduled" | "live" | "ended";
  visibility: string;
  scheduled_at?: string | null;
  started_at?: string | null;
};

export default function LivePage() {
  const [items, setItems] = useState<LiveSession[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
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

  useEffect(() => { void load(); }, []);

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
          visibility: "public",
        }),
      });
      setTitle("");
      setDescription("");
      setScheduledAt("");
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
      await load();
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
                Crie e acompanhe sessões de transmissão do RESA. A sessão é persistida no sistema; a camada de vídeo pode ser ligada ao provedor de streaming quando configurada.
              </p>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={createLive} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0C1A3D]">Criar uma Live</h2>
            <p className="mt-1 text-sm text-slate-500">A sessão será criada com visibilidade pública.</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="Título da transmissão" className="mt-5 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0C1A3D]" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Descrição (opcional)" className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#0C1A3D]" />
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
                        {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                        {item.scheduled_at && <p className="mt-3 text-sm text-slate-500">Agendada para {new Date(item.scheduled_at).toLocaleString("pt-PT")}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.status === "scheduled" && <button onClick={() => void setStatus(item.id, "live")} className="rounded-xl bg-[#0C1A3D] px-3 py-2 text-sm font-semibold text-white">Iniciar</button>}
                        {(item.status === "scheduled" || item.status === "live") && <button onClick={() => setStudioLive(item)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Abrir Studio</button>}
                        {item.status === "live" && <button onClick={() => void setStatus(item.id, "ended")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Encerrar</button>}
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
