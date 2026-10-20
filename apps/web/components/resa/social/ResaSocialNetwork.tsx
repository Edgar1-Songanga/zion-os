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
  return person.display_name?.trim() || [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || "Membro ZION";
}

function Avatar({ person, size = "h-11 w-11" }: { person: Person; size?: string }) {
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 text-sm font-bold text-[#0C1A3D] ring-1 ring-slate-200/80`}>
      {person.avatar_url ? <img src={person.avatar_url} alt={`Fotografia de ${nameOf(person)}`} className="h-full w-full object-cover" /> : nameOf(person).slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ResaSocialNetwork({ userId }: { userId: string }) {
  const [social, setSocial] = useState<Social | null>(null);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, suggested] = await Promise.all([
        resaRequest<Social>("/v1/resa/profiles/" + encodeURIComponent(userId) + "/social"),
        resaRequest<Person[]>("/v1/resa/profiles/suggestions?limit=8"),
      ]);
      setSocial(current);
      setSuggestions(suggested);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a rede.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFollow(personId: string, following: boolean) {
    setBusyId(personId);
    setError("");
    setNotice("");
    try {
      await resaRequest("/v1/resa/profiles/" + encodeURIComponent(personId) + "/follow", { method: following ? "DELETE" : "POST" });
      setNotice(following ? "Deixou de seguir este perfil." : "Ligação criada. Já está a seguir este perfil.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a ligação.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !social) {
    return (
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(12,26,61,0.06)]" aria-busy="true">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-6 w-52 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="h-24 animate-pulse rounded-2xl bg-slate-50" /><div className="h-24 animate-pulse rounded-2xl bg-slate-50" /></div>
      </section>
    );
  }

  if (!social) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-[#0C1A3D]">A sua rede não ficou disponível</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error || "Verifique a ligação e tente novamente."}</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50">Tentar novamente</button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(12,26,61,0.07)]">
        <div className="bg-gradient-to-r from-[#07142f] via-[#102653] to-[#123d72] px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200">ZION RESA · Ligações</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-2xl font-semibold tracking-tight">A sua comunidade</h2><p className="mt-1 max-w-lg text-sm leading-6 text-blue-100/75">Descubra pessoas, fortaleça relações e mantenha-se ligado à comunidade.</p></div>
            <div className="flex gap-2">
              <div className="min-w-[94px] rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-center backdrop-blur"><strong className="block text-xl tabular-nums">{social.followers_count}</strong><span className="text-[10px] font-medium uppercase tracking-wide text-blue-100/75">Seguidores</span></div>
              <div className="min-w-[94px] rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-center backdrop-blur"><strong className="block text-xl tabular-nums">{social.following_count}</strong><span className="text-[10px] font-medium uppercase tracking-wide text-blue-100/75">A seguir</span></div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {error && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

          <div className="grid gap-7 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between"><h3 className="font-semibold text-[#0C1A3D]">Seguidores</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{social.followers_count}</span></div>
              <div className="mt-3 space-y-2">
                {social.followers.slice(0, 8).map((person) => (
                  <div key={person.id} className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-blue-100 hover:bg-blue-50/30">
                    <Avatar person={person} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{nameOf(person)}</p>
                    <Link href={"/resa/messages?to=" + encodeURIComponent(person.id)} aria-label={`Enviar mensagem a ${nameOf(person)}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0C1A3D] transition hover:border-blue-200 hover:bg-blue-50">Mensagem</Link>
                  </div>
                ))}
                {!social.followers.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">Ainda não tem seguidores. Partilhe algo significativo para começar a construir a sua comunidade.</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between"><h3 className="font-semibold text-[#0C1A3D]">A seguir</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{social.following_count}</span></div>
              <div className="mt-3 space-y-2">
                {social.following.slice(0, 8).map((person) => (
                  <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-blue-100 hover:bg-blue-50/30">
                    <Avatar person={person} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{nameOf(person)}</p>
                    <button type="button" onClick={() => void toggleFollow(person.id, true)} disabled={busyId === person.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-700 disabled:opacity-50">{busyId === person.id ? "A atualizar…" : "A seguir"}</button>
                  </div>
                ))}
                {!social.following.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">Ainda não segue ninguém. Explore as sugestões abaixo para encontrar pessoas e comunidades relevantes.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_60px_rgba(12,26,61,0.05)] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Descoberta personalizada</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">Pessoas que pode conhecer</h2><p className="mt-1 text-sm text-slate-500">Amplie a sua rede, ao seu ritmo.</p></div>
          <Link href="/resa/messages" className="text-sm font-semibold text-[#174ea6] transition hover:text-blue-800">Abrir mensagens <span aria-hidden="true">→</span></Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {suggestions.map((person) => (
            <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-blue-100 hover:shadow-sm">
              <Avatar person={person} size="h-12 w-12" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#0C1A3D]">{nameOf(person)}</p><p className="mt-0.5 text-xs text-slate-500">Sugestão para a sua rede</p></div>
              <button type="button" onClick={() => void toggleFollow(person.id, false)} disabled={busyId === person.id} className="rounded-xl bg-[#0C1A3D] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">{busyId === person.id ? "A atualizar…" : "＋ Seguir"}</button>
            </div>
          ))}
          {!suggestions.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500 sm:col-span-2">Não há novas sugestões neste momento. Volte mais tarde para descobrir novas ligações.</p>}
        </div>
      </div>
    </section>
  );
}
