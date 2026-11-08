"use client";

import { useCallback, useEffect, useState } from "react";
import CreatePost from "@/components/resa/CreatePost";
import { resaRequest } from "@/lib/resa/api";

type Story = {
  id: string;
  author_id: string;
  title?: string | null;
  body?: string | null;
  created_at: string;
  type: string;
  media_type?: "image" | "video" | null;
  media_url?: string | null;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  visibility: string;
};

export default function StoriesPage() {
  const [items, setItems] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await resaRequest<Story[]>("/v1/resa/stories?limit=60"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as stories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeStory = activeIndex === null ? null : items[activeIndex] ?? null;

  function openStory(id: string) {
    const index = items.findIndex(item => item.id === id);
    if (index >= 0) setActiveIndex(index);
  }

  function moveStory(direction: -1 | 1) {
    setActiveIndex(current => {
      if (current === null) return null;
      const next = current + direction;
      if (next < 0 || next >= items.length) return null;
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-[#07142f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">RESA · Stories</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Momentos que expiram. Memórias que permanecem.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Partilhe um momento em imagem, vídeo ou texto. As stories desaparecem automaticamente da área ativa após 24 horas e respeitam a audiência escolhida.</p>
        </header>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 sm:p-7">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Criar</p>
            <h2 className="mt-1 text-xl font-semibold">A sua story</h2>
          </div>
          <CreatePost initialType="story" onPublished={() => void load()} />
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Últimas 24 horas</p>
              <h2 className="mt-1 text-2xl font-semibold">Stories da comunidade</h2>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50">Atualizar</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-white/10" />) :
              items.length ? items.map(item => (
                <button key={item.id} type="button" onClick={() => openStory(item.id)} className="group relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900 text-left shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {item.media_type === "image" && item.media_url ? <img src={item.media_url} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> :
                    item.media_type === "video" && item.media_url ? <video src={item.media_url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" /> :
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/25" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    {item.author_avatar_url ? <img src={item.author_avatar_url} alt="" className="h-8 w-8 rounded-full border-2 border-blue-300 object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-300 bg-slate-700 text-xs font-semibold">{(item.author_display_name || "M").slice(0, 1).toUpperCase()}</span>}
                    <span className="max-w-[9rem] truncate text-xs font-semibold text-white">{item.author_display_name || "Membro RESA"}</span>
                  </div>
                  <div className="absolute inset-x-4 bottom-4">
                    <p className="line-clamp-4 text-sm font-medium leading-5 text-white">{item.title || item.body || "Story RESA"}</p>
                    <p className="mt-2 text-[10px] text-white/65">{new Date(item.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} · 24 h</p>
                  </div>
                </button>
              )) : <div className="col-span-full rounded-[1.5rem] border border-dashed border-white/15 p-12 text-center text-slate-300">Ainda não existem stories ativas. Crie a primeira story da comunidade.</div>}
          </div>
        </section>
      </div>

      {activeStory && activeIndex !== null && (
        <div role="dialog" aria-modal="true" aria-label="Visualizador de stories" className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6">
          <div className="relative flex h-[min(88vh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
            <div className="absolute inset-x-4 top-4 z-20 flex gap-1.5">
              {items.map((item, index) => <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className={"block h-full rounded-full " + (index <= activeIndex ? "bg-white" : "bg-transparent")} /></span>)}
            </div>
            <div className="absolute inset-x-4 top-8 z-20 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {activeStory.author_avatar_url ? <img src={activeStory.author_avatar_url} alt="" className="h-9 w-9 rounded-full border border-white/50 object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">{(activeStory.author_display_name || "M").slice(0, 1).toUpperCase()}</span>}
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{activeStory.author_display_name || "Membro RESA"}</p><p className="text-[11px] text-white/65">{new Date(activeStory.created_at).toLocaleString("pt-PT")}</p></div>
              </div>
              <button type="button" onClick={() => setActiveIndex(null)} aria-label="Fechar stories" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-xl text-white">×</button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              {activeStory.media_type === "image" && activeStory.media_url ? <img src={activeStory.media_url} alt={activeStory.title || "Story"} className="h-full w-full object-contain" /> :
                activeStory.media_type === "video" && activeStory.media_url ? <video src={activeStory.media_url} controls autoPlay playsInline className="h-full w-full object-contain" /> :
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950 p-10 text-center"><p className="whitespace-pre-wrap text-xl font-medium leading-8">{activeStory.title || activeStory.body || "Story RESA"}</p></div>}
              <button type="button" onClick={() => moveStory(-1)} aria-label="Story anterior" className="absolute left-0 top-1/2 h-24 w-1/4 -translate-y-1/2 bg-transparent" />
              <button type="button" onClick={() => moveStory(1)} aria-label="Story seguinte" className="absolute right-0 top-1/2 h-24 w-1/4 -translate-y-1/2 bg-transparent" />
            </div>
            {activeStory.media_url && activeStory.body && <div className="bg-slate-950 px-5 py-4 text-sm leading-6 text-slate-200">{activeStory.body}</div>}
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-950 px-4 py-3">
              <button type="button" onClick={() => moveStory(-1)} disabled={activeIndex === 0} className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-30">Anterior</button>
              <span className="text-xs text-white/55">{activeIndex + 1} / {items.length}</span>
              <button type="button" onClick={() => moveStory(1)} disabled={activeIndex === items.length - 1} className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-30">Seguinte</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
