"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type Person = {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

type Social = {
  user_id: string;
  is_following: boolean;
  followers_count: number;
  following_count: number;
  followers: Person[];
  following: Person[];
};

function nameOf(person: Person) {
  return person.display_name || [person.first_name, person.last_name].filter(Boolean).join(" ") || "Membro ZION";
}

export default function ResaSocialNetwork({ userId }: { userId: string }) {
  const [social, setSocial] = useState<Social | null>(null);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [current, suggested] = await Promise.all([
        resaRequest<Social>("/v1/resa/profiles/" + userId + "/social"),
        resaRequest<Person[]>("/v1/resa/profiles/suggestions?limit=8"),
      ]);
      setSocial(current);
      setSuggestions(suggested);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a rede.");
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFollow(personId: string, following: boolean) {
    setBusyId(personId);
    setError("");
    try {
      await resaRequest("/v1/resa/profiles/" + personId + "/follow", { method: following ? "DELETE" : "POST" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a ligação.");
    } finally {
      setBusyId(null);
    }
  }

  if (!social) {
    return <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-400">A carregar a sua rede…</section>;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rede RESA</p>
            <h2 className="mt-1 text-xl font-semibold text-[#0C1A3D]">Seguidores e ligações</h2>
            <p className="mt-1 text-sm text-slate-500">Construa a sua rede e encontre pessoas sem depender de pesquisa manual.</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-[#eef2f8] px-4 py-3 text-center"><strong className="block text-lg text-[#0C1A3D]">{social.followers_count}</strong><span className="text-[11px] text-slate-500">Seguidores</span></div>
            <div className="rounded-2xl bg-[#eef2f8] px-4 py-3 text-center"><strong className="block text-lg text-[#0C1A3D]">{social.following_count}</strong><span className="text-[11px] text-slate-500">A seguir</span></div>
          </div>
        </div>

        {error && <div role="alert" className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#0C1A3D]">Seguidores</h3>
            <div className="mt-3 space-y-2">
              {social.followers.slice(0, 8).map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2f8] text-sm font-bold text-[#0C1A3D]">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : nameOf(person).slice(0, 1).toUpperCase()}</div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{nameOf(person)}</p>
                  <Link href={"/resa/messages?to=" + encodeURIComponent(person.id)} className="rounded-xl bg-[#0C1A3D] px-3 py-2 text-xs font-semibold text-white">Mensagem</Link>
                </div>
              ))}
              {!social.followers.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">Ainda não tem seguidores.</p>}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0C1A3D]">A seguir</h3>
            <div className="mt-3 space-y-2">
              {social.following.slice(0, 8).map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2f8] text-sm font-bold text-[#0C1A3D]">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : nameOf(person).slice(0, 1).toUpperCase()}</div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{nameOf(person)}</p>
                  <button type="button" onClick={() => void toggleFollow(person.id, true)} disabled={busyId === person.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">{busyId === person.id ? "…" : "A seguir"}</button>
                </div>
              ))}
              {!social.following.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">Ainda não segue ninguém.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Descobrir</p>
            <h2 className="mt-1 text-xl font-semibold text-[#0C1A3D]">Pessoas que pode conhecer</h2>
          </div>
          <Link href="/resa/messages" className="text-xs font-semibold text-[#0C1A3D]">Abrir mensagens</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {suggestions.map((person) => (
            <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef2f8] text-sm font-bold text-[#0C1A3D]">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : nameOf(person).slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#0C1A3D]">{nameOf(person)}</p><p className="text-xs text-slate-400">Membro da rede ZION</p></div>
              <button type="button" onClick={() => void toggleFollow(person.id, false)} disabled={busyId === person.id} className="rounded-xl bg-[#0C1A3D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busyId === person.id ? "…" : "Seguir"}</button>
            </div>
          ))}
          {!suggestions.length && <p className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">Não há novas sugestões neste momento.</p>}
        </div>
      </div>
    </section>
  );
}
