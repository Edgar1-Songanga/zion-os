"use client";

import { useEffect, useState } from "react";
import FeedCard from "@/components/resa/FeedCard";
import { resaRequest } from "@/lib/resa/api";
import { resolveResaMediaUrls } from "@/lib/resa/media";

type SavedContent = {
  id: string;
  author_id: string;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  type: string;
  title?: string | null;
  body?: string | null;
  visibility: string;
  language: string;
  created_at: string;
  media_type?: "image" | "video" | null;
  media_url?: string | null;
  viewer_saved?: boolean;
  viewer_reacted?: boolean;
  reaction_count?: number;
  comment_count?: number;
  share_count?: number;
};

export default function SavedPage() {
  const [items, setItems] = useState<SavedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void resaRequest<{ items: SavedContent[] }>("/v1/resa/saved?limit=60")
      .then(async (result) => {
        const rows = result.items ?? [];
        const urls = await resolveResaMediaUrls(rows.filter((item) => !item.media_url && item.media_type).map((item) => item.id));
        if (active) setItems(rows.map((item) => ({ ...item, media_url: item.media_url || urls[item.id] || null })));
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os guardados."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-1 py-6 sm:px-3">
      <header className="mb-6 rounded-3xl bg-[#0C1A3D] p-7 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">A tua biblioteca</p>
        <h1 className="mt-2 text-3xl font-semibold">Publicações guardadas</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Reúne aqui as publicações que guardaste para consultar mais tarde.</p>
      </header>
      {error && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <div className="space-y-4"><div className="h-48 animate-pulse rounded-3xl bg-white" /><div className="h-48 animate-pulse rounded-3xl bg-white" /></div>
        : items.length ? <div className="space-y-4">{items.map((item) => <FeedCard key={item.id} content={item} />)}</div>
        : <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="font-semibold text-[#0C1A3D]">Ainda não guardaste publicações.</h2><p className="mt-2 text-sm text-slate-500">Usa a opção Guardar numa publicação para a encontrar aqui.</p></section>}
    </main>
  );
}
