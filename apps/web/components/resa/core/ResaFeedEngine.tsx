"use client";

import { useEffect, useState } from "react";
import FeedCard from "../FeedCard";
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

export default function ResaFeedEngine() {
  const [content, setContent] = useState<ResaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void resaRequest<ResaContent[]>("/v1/resa/content")
      .then((items) => {
        if (active) setContent(items);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o feed.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="space-y-4" aria-label="A carregar o feed"><div className="h-48 animate-pulse rounded-3xl bg-slate-200" /><div className="h-48 animate-pulse rounded-3xl bg-slate-200" /></div>;
  }

  if (error) {
    return <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  if (!content.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-semibold text-[#0C1A3D]">O seu feed está pronto para começar</h3><p className="mt-2 text-sm text-slate-500">Partilhe uma reflexão, um pedido de oração ou uma atualização com a sua comunidade.</p></div>;
  }

  return <div className="space-y-6">{content.map((item) => <FeedCard key={item.id} content={item} />)}</div>;
}
