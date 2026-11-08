"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type Profile = {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country_code?: string | null;
  is_owner: boolean;
  is_following: boolean;
  message_allowed: boolean;
  call_allowed: boolean;
  group_invite_allowed: boolean;
  follow_allowed: boolean;
  private_locked?: boolean;
  viewer_has_blocked?: boolean;
  viewer_has_muted?: boolean;
};
type Content = { id: string; title?: string | null; body?: string | null; media_type?: string | null; media_url?: string | null; created_at: string };
type Result = { profile: Profile; contents: Content[] };

export default function ResaMemberProfile({ userId }: { userId: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    setError("");
    try {
      const result = await resaRequest<Result>("/v1/resa/profiles/" + encodeURIComponent(userId));
      setData(result);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir este perfil.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFollow() {
    if (!data || busy) return;
    setBusy(true);
    try {
      await resaRequest("/v1/resa/profiles/" + encodeURIComponent(userId) + "/follow", { method: data.profile.is_following ? "DELETE" : "POST" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a ligação.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!data || busy) return;
    if (!data.profile.viewer_has_blocked && !window.confirm("Bloquear este membro? Deixará de ver as suas publicações e as interações entre as duas contas serão impedidas.")) return;
    setBusy(true);
    setError("");
    try {
      await resaRequest("/v1/resa/profiles/" + encodeURIComponent(userId) + "/block", {
        method: data.profile.viewer_has_blocked ? "DELETE" : "POST",
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o bloqueio.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      await resaRequest("/v1/resa/profiles/" + encodeURIComponent(userId) + "/mute", {
        method: data.profile.viewer_has_muted ? "DELETE" : "POST",
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o silenciamento.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8"><div className="h-20 w-20 rounded-full bg-slate-100"/><div className="mt-5 h-6 w-48 rounded bg-slate-100"/><div className="mt-3 h-4 w-72 rounded bg-slate-100"/></div></main>;
  if (!data) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><div role="alert" className="rounded-3xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-semibold text-slate-900">Perfil indisponível</h1><p className="mt-2 text-sm text-slate-600">{error || "Este perfil não está disponível para a sua conta."}</p><Link href="/resa" className="mt-5 inline-flex rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white">Voltar ao RESA</Link></div></main>;

  const profile = data.profile;
  const name = profile.display_name?.trim() || [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Membro RESA";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-3 pb-10 sm:p-6">
      <div className="flex items-center justify-between"><Link href="/resa" className="text-sm font-semibold text-slate-600 hover:text-[#0C1A3D]">← Voltar ao RESA</Link>{profile.is_owner && <div className="flex items-center gap-3"><Link href="/resa/muted" className="text-sm font-semibold text-slate-600 hover:text-[#0C1A3D]">Contas silenciadas</Link><Link href="/resa/blocked" className="text-sm font-semibold text-slate-600 hover:text-[#0C1A3D]">Contas bloqueadas</Link><Link href="/profile" className="text-sm font-semibold text-blue-700 hover:underline">Editar perfil</Link></div>}</div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-2xl font-semibold text-[#0C1A3D]">{profile.avatar_url ? <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" /> : initials}</div>
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-tight text-[#0C1A3D]">{name}</h1>{profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio}</p>}{profile.country_code && <p className="mt-2 text-xs text-slate-400">{profile.country_code}</p>}</div>
        </div>
        {profile.private_locked && <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Este perfil é privado. Pode seguir este membro se ele aceitar novos seguidores; as publicações e os detalhes só serão apresentados depois de o seguir.</p>}
        {!profile.is_owner && <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {!profile.viewer_has_blocked && profile.follow_allowed && <button type="button" disabled={busy} onClick={() => void toggleFollow()} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "A atualizar…" : profile.is_following ? "A seguir" : "Seguir"}</button>}
          {!profile.viewer_has_blocked && profile.message_allowed && <Link href={"/resa/messages?to=" + encodeURIComponent(userId)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] hover:bg-slate-50">Mensagem</Link>}
          {!profile.viewer_has_blocked && profile.call_allowed && <Link href={"/resa/messages?to=" + encodeURIComponent(userId) + "&call=audio"} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] hover:bg-slate-50">Ligar</Link>}
          {profile.viewer_has_blocked && <p className="w-full rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Bloqueaste este membro. As publicações e interações entre as duas contas estão limitadas.</p>}
          <button type="button" disabled={busy} onClick={() => void toggleMute()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy ? "A atualizar…" : profile.viewer_has_muted ? "Retirar silêncio" : "Silenciar"}</button>
          <button type="button" disabled={busy} onClick={() => void toggleBlock()} className={profile.viewer_has_blocked ? "rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" : "rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"}>{busy ? "A atualizar…" : profile.viewer_has_blocked ? "Desbloquear" : "Bloquear"}</button>
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#0C1A3D]">Publicações</h2><span className="text-xs text-slate-400">{data.contents.length} recentes</span></div>
        {data.contents.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Ainda não existem publicações públicas neste perfil.</div>}
        {data.contents.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {item.title && <h3 className="font-semibold text-slate-900">{item.title}</h3>}
          {item.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p>}
          {item.media_type === "image" && item.media_url && <img src={item.media_url} alt={item.title || "Imagem publicada"} loading="lazy" className="mt-3 max-h-96 w-full rounded-xl object-cover"/>}
          {item.media_type === "video" && item.media_url && <video src={item.media_url} controls playsInline preload="metadata" className="mt-3 max-h-96 w-full rounded-xl bg-black"/>}
          <p className="mt-3 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString("pt-PT")}</p>
        </article>)}
      </section>
    </main>
  );
}
