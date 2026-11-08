"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CreateCommunity from "@/components/resa/communities/CreateCommunity";
import { resaRequest } from "@/lib/resa/api";

type Community = {
  id: string; name: string; slug: string; description?: string | null; visibility: string;
  membership_status?: "active" | "left" | "not_member" | "owner"; membership_role?: string | null;
};

export default function CommunitiesPage() {
  const [items, setItems] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await resaRequest<Community[]>("/v1/resa/communities")); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar as comunidades."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function toggle(item: Community) {
    if (busyRef.current || item.membership_status === "owner") return;
    if (item.membership_status !== "active" && item.visibility !== "public") {
      setError("Esta comunidade exige convite ou aprovação de um moderador.");
      return;
    }
    busyRef.current = true;
    const joining = item.membership_status !== "active";
    const previous = items;
    setBusyId(item.id);
    setError(null);
    // Update the button immediately; roll back only if the server rejects it.
    setItems((current) => current.map((community) => community.id === item.id
      ? { ...community, membership_status: joining ? "active" : "left" }
      : community));
    try {
      const path = joining
        ? `/v1/resa/communities/${item.id}/join`
        : `/v1/resa/communities/${item.id}/leave`;
      await resaRequest(path, { method: "POST" });
    } catch (e) {
      setItems(previous);
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a participação.");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-[#0C1A3D] p-7 text-white shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Comunidades</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Encontre a sua comunidade.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Participe de espaços reais da rede RESA, acompanhe a vida comunitária e mantenha o seu vínculo sob controlo.</p>
        </header>

        <div className="mt-7"><CreateCommunity onCreated={() => void load()} /></div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading ? Array.from({length: 6}).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-[1.75rem] border bg-white" />) :
          items.length ? items.map(item => (
            <article key={item.id} className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.visibility}</p><h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">{item.name}</h2></div>
                {item.membership_status === "active" && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Membro</span>}
                {item.membership_status === "owner" && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Criada por si</span>}
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{item.description || "Espaço comunitário da rede RESA."}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{item.membership_role ? `Função · ${item.membership_role}` : "Participação aberta"}</span>
                {item.membership_status === "owner" ? <span className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">Proprietário</span> :
                  <button disabled={busyId !== null || (item.membership_status !== "active" && item.visibility !== "public")} onClick={() => void toggle(item)} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
                    {busyId === item.id ? "A atualizar…" : item.membership_status === "active" ? "Sair" : item.visibility === "public" ? "Entrar" : "Acesso restrito"}
                  </button>}
              </div>
            </article>
          )) : <div className="col-span-full rounded-[1.75rem] border border-dashed bg-white p-12 text-center text-slate-500">Ainda não existem comunidades disponíveis.</div>}
        </section>
      </div>
    </main>
  );
}
