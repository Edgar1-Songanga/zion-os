"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";
import { resolveResaMediaUrls } from "@/lib/resa/media";

type SearchType = "all" | "content" | "profile" | "topic" | "community" | "event";
type Result = {
  id: string;
  entity_id?: string;
  entity_type?: string;
  title?: string | null;
  body?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
  normalized_name?: string | null;
  visibility?: string | null;
  type?: string | null;
  created_at?: string;
  starts_at?: string;
  location?: string | null;
  media_type?: "image" | "video" | null;
  media_url?: string | null;
};

const filters: Array<{ value: SearchType; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "content", label: "Publicações" },
  { value: "profile", label: "Pessoas" },
  { value: "topic", label: "Tópicos" },
  { value: "community", label: "Comunidades" },
  { value: "event", label: "Eventos" },
];

async function hydrateMedia(results: Result[]): Promise<Result[]> {
  const contentIds = results
    .filter((item) => (item.entity_type || "content") === "content" && !item.media_url && item.media_type)
    .map((item) => item.entity_id || item.id);
  if (!contentIds.length) return results;
  const urls = await resolveResaMediaUrls(contentIds);
  return results.map((item) => {
    if ((item.entity_type || "content") !== "content" || item.media_url) return item;
    const id = item.entity_id || item.id;
    return { ...item, media_url: urls[id] || null };
  });
}

function resultHref(item: Result) {
  const id = item.entity_id || item.id;
  switch (item.entity_type) {
    case "profile": return "/resa/profile/" + encodeURIComponent(id);
    case "content": return "/resa?post=" + encodeURIComponent(id);
    case "topic": return "/resa/topics/" + encodeURIComponent(item.normalized_name || item.title?.replace(/^#/, "") || "");
    case "community": return "/resa/communities";
    case "event": return "/resa/events";
    default: return "/resa";
  }
}

function resultLabel(type?: string) {
  switch (type) {
    case "profile": return "Pessoa";
    case "content": return "Publicação";
    case "topic": return "Tópico";
    case "community": return "Comunidade";
    case "event": return "Evento";
    default: return "RESA";
  }
}

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [activeType, setActiveType] = useState<SearchType>("all");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestVersion = useRef(0);

  async function search(event?: FormEvent, selectedType: SearchType = activeType) {
    event?.preventDefault();
    const query = q.trim();
    if (query.length < 2) {
      setError("Escreva pelo menos dois caracteres para pesquisar.");
      return;
    }
    const version = ++requestVersion.current;
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query, limit: "24" });
      if (selectedType !== "all") params.set("type", selectedType);
      const results = await resaRequest<Result[]>("/v1/resa/search?" + params.toString());
      const hydrated = await hydrateMedia(results);
      if (version === requestVersion.current) setItems(hydrated);
    } catch (e) {
      if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Não foi possível pesquisar.");
    } finally {
      if (version === requestVersion.current) setSearching(false);
    }
  }

  useEffect(() => {
    let active = true;
    void resaRequest<Result[]>("/v1/resa/explore")
      .then((data) => {
        if (active && requestVersion.current === 0) {
          void hydrateMedia(data.map((item) => ({ ...item, entity_type: "content", entity_id: item.id }))).then((hydrated) => {
            if (active && requestVersion.current === 0) setItems(hydrated);
          });
        }
      })
      .catch((e) => {
        if (active && requestVersion.current === 0) setError(e instanceof Error ? e.message : "Não foi possível carregar a exploração.");
      });
    return () => { active = false; };
  }, []);

  function selectFilter(value: SearchType) {
    setActiveType(value);
    if (q.trim().length >= 2) void search(undefined, value);
    else {
      setSearched(false);
      setError(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] bg-[#0C1A3D] p-7 text-white shadow-[0_24px_70px_rgba(12,26,61,0.18)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Descoberta</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Encontre pessoas, ideias e comunidades.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Pesquise publicações, membros, tópicos, comunidades e eventos num único lugar. Os resultados respeitam as permissões e a privacidade de cada espaço.</p>
          <form onSubmit={(event) => void search(event)} className="mt-7 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="O que procura no RESA?"
              aria-label="Pesquisar no RESA"
              className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm text-[#0C1A3D] outline-none placeholder:text-slate-400"
            />
            <button type="submit" disabled={searching || q.trim().length < 2} className="rounded-xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#172b55] disabled:cursor-not-allowed disabled:opacity-50">
              {searching ? "A pesquisar…" : "Pesquisar"}
            </button>
          </form>
        </header>

        <nav aria-label="Categorias de pesquisa" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => selectFilter(filter.value)}
              aria-pressed={activeType === filter.value}
              className={activeType === filter.value
                ? "shrink-0 rounded-full bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-[#0C1A3D]"}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        <section className="mt-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{searched ? "Pesquisa" : "Descoberta"}</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#0C1A3D]">{searched ? "Resultados" : "Publicações recentes"}</h2>
            </div>
            {searched && <span className="text-xs text-slate-400">{items.length} resultado(s)</span>}
          </div>

          {error && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {searching ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white" />)}
            </div>
          ) : items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const type = item.entity_type || "content";
                const title = item.title || item.display_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || (type === "topic" ? "Tópico" : "Resultado RESA");
                return (
                  <Link key={type + "-" + (item.entity_id || item.id)} href={resultHref(item)} className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{resultLabel(type)}</span>
                      {item.visibility && <span className="text-[10px] font-medium text-slate-400">{item.visibility}</span>}
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-lg font-semibold text-[#0C1A3D] group-hover:text-blue-800">{title}</h3>
                    {item.body && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.body}</p>}
                    {type === "content" && item.media_type === "image" && item.media_url && <img src={item.media_url} alt={title} loading="lazy" className="mt-4 max-h-56 w-full rounded-2xl object-cover" />}
                    {type === "content" && item.media_type === "video" && item.media_url && <video src={item.media_url} controls playsInline preload="none" className="mt-4 max-h-56 w-full rounded-2xl bg-black" />}
                    {type === "event" && item.starts_at && <p className="mt-3 text-xs font-medium text-slate-500">{new Date(item.starts_at).toLocaleString("pt-PT")}{item.location ? " · " + item.location : ""}</p>}
                    {type === "profile" && item.avatar_url && <img src={item.avatar_url} alt="" loading="lazy" className="mt-4 h-10 w-10 rounded-xl object-cover" />}
                    <p className="mt-5 text-xs font-semibold text-[#0C1A3D]">Abrir {type === "profile" ? "perfil" : type === "content" ? "publicação" : type === "topic" ? "tópico" : type === "community" ? "comunidades" : "eventos"} <span aria-hidden="true">→</span></p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="font-semibold text-[#0C1A3D]">{searched ? "Não foram encontrados resultados." : "Ainda não há publicações para explorar."}</h3>
              <p className="mt-2 text-sm text-slate-500">{searched ? "Experimente outra expressão ou escolha uma categoria diferente." : "As publicações públicas da comunidade aparecerão aqui."}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
