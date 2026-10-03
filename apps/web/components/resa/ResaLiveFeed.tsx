"use client";

import { useCallback, useEffect, useState } from "react";
import CreatePost from "./CreatePost";
import FeedCard from "./FeedCard";
import { resaRequest } from "@/lib/resa/api";

type ResaContent = {
  id: string;
  author_id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  visibility: string;
  language: string;
  created_at: string;
};

export default function ResaLiveFeed() {
  const [items, setItems] = useState<ResaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await resaRequest<ResaContent[]>("/v1/resa/feed?limit=30"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-8">
      <CreatePost onPublished={load} />
      {loading && <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500">A carregar o RESA…</div>}
      {error && <div className="rounded-3xl border border-red-200 bg-white p-6 text-red-700">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
          Ainda não existem publicações públicas. Seja o primeiro a publicar.
        </div>
      )}
      {items.map((item) => <FeedCard key={item.id} content={item} />)}
    </div>
  );
}
