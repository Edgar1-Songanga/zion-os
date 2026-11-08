"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type Reel = {
  id: string;
  author_id: string;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  title?: string | null;
  body?: string | null;
  media_url: string;
  created_at: string;
};

export default function ResaReels() {
  const [items, setItems] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());

  useEffect(() => {
    let active = true;
    resaRequest<Reel[]>("/v1/resa/reels?limit=30")
      .then((data) => { if (active) setItems(data); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar os Reels."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, 0.7, 1] });
    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [items]);

  async function toggleLike(id: string) {
    if (busy === id) return;
    const next = !liked[id];
    setBusy(id);
    setLiked((current) => ({ ...current, [id]: next }));
    try {
      await resaRequest(`/v1/resa/content/${id}/reactions`, next
        ? { method: "POST", body: JSON.stringify({ reaction_type: "like" }) }
        : { method: "DELETE" });
    } catch {
      setLiked((current) => ({ ...current, [id]: !next }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-2 pb-8 pt-5 sm:px-4">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0C1A3D]">Reels</h1><p className="mt-1 text-sm text-slate-500">Vídeos públicos da comunidade.</p></div>
        <Link href="/resa" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Voltar ao mural</Link>
      </div>
      {loading && <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">A carregar vídeos…</div>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && items.length === 0 && <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center"><h2 className="text-lg font-semibold text-[#0C1A3D]">Ainda não há Reels públicos</h2><p className="mt-2 text-sm text-slate-500">Quando os membros publicarem vídeos com visibilidade pública, aparecerão aqui.</p></div>}
      {items.length > 0 && <section aria-label="Vídeos Reels" className="mx-auto h-[min(76vh,820px)] max-w-[460px] snap-y snap-mandatory space-y-4 overflow-y-auto rounded-[30px] scroll-smooth">
        {items.map((item) => <article key={item.id} className="relative h-[min(76vh,820px)] min-h-[520px] snap-start overflow-hidden rounded-[30px] bg-black shadow-xl">
          <video ref={(node) => { if (node) videoRefs.current.set(item.id, node); else videoRefs.current.delete(item.id); }} src={item.media_url} controls playsInline muted loop preload="metadata" className="absolute inset-0 h-full w-full object-contain" aria-label={item.title || "Vídeo RESA"} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 pt-24 text-white">
            <p className="text-sm font-semibold">{item.author_display_name || "Membro RESA"}</p>
            {(item.title || item.body) && <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6">{item.title ? item.title + (item.body ? "\n" + item.body : "") : item.body}</p>}
            <p className="mt-2 text-xs text-white/65">{new Date(item.created_at).toLocaleDateString("pt-PT")}</p>
          </div>
          <div className="absolute bottom-5 right-4 flex flex-col gap-3">
            <button type="button" onClick={() => void toggleLike(item.id)} disabled={busy === item.id} aria-label={liked[item.id] ? "Retirar gosto" : "Gostar"} className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/45 text-xl text-white backdrop-blur transition hover:bg-black/70 ${liked[item.id] ? "text-rose-400" : ""}`}>{liked[item.id] ? "♥" : "♡"}</button>
            <Link href={`/resa?post=${encodeURIComponent(item.id)}`} aria-label="Abrir publicação" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/45 text-sm text-white backdrop-blur">↗</Link>
          </div>
        </article>)}
      </section>}
      <p className="mx-auto mt-4 max-w-[460px] text-center text-xs text-slate-400">Reprodução automática sem som ao entrar no vídeo. O som pode ser ativado nos controlos do leitor.</p>
    </main>
  );
}
