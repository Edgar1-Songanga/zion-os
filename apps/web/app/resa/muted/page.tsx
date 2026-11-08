"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type MutedProfile = {
  user_id: string;
  muted_at: string;
  profile: { display_name?: string | null; first_name?: string | null; last_name?: string | null; avatar_url?: string | null } | null;
};

export default function ResaMutedProfilesPage() {
  const [items, setItems] = useState<MutedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await resaRequest<MutedProfile[]>("/v1/resa/profiles/muted"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as contas silenciadas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function unmute(userId: string) {
    if (busyId) return;
    setBusyId(userId);
    setError("");
    try {
      await resaRequest("/v1/resa/profiles/" + encodeURIComponent(userId) + "/mute", { method: "DELETE" });
      setItems((current) => current.filter((item) => item.user_id !== userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível reativar esta conta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-3 pb-10 sm:p-6">
      <div className="flex items-center justify-between">
        <Link href="/resa" className="text-sm font-semibold text-slate-600 hover:text-[#0C1A3D]">← Voltar ao RESA</Link>
        <h1 className="text-xl font-semibold tracking-tight text-[#0C1A3D]">Contas silenciadas</h1>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm leading-6 text-slate-600">As publicações destas contas deixam de aparecer no teu feed e as notificações sociais deixam de ser apresentadas. Continuas a poder seguir e enviar mensagens, conforme as regras de privacidade. Só tu podes consultar esta lista.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="mt-5 text-sm text-slate-500">A carregar…</p>}
        {!loading && items.length === 0 && !error && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Não tens contas silenciadas.</div>}
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const profile = item.profile;
            const name = profile?.display_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || "Membro RESA";
            const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
            return (
              <article key={item.user_id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-[#0C1A3D]">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-400">Silenciada em {new Date(item.muted_at).toLocaleDateString("pt-PT")}</p>
                </div>
                <button type="button" disabled={busyId !== null} onClick={() => void unmute(item.user_id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {busyId === item.user_id ? "A atualizar…" : "Reativar"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
