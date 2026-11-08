"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";
import FeedCard from "@/components/resa/FeedCard";

type TopicContent = {
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
  viewer_reacted?: boolean;
  viewer_saved?: boolean;
};

type TopicResponse = {
  topic: { id: string; name: string; normalized_name: string } | null;
  contents: TopicContent[];
};

export default function ResaTopicFeed({ slug }: { slug: string }) {
  const [data, setData] = useState<TopicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resaRequest<TopicResponse>("/v1/resa/topics/" + encodeURIComponent(slug))
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar este tema."); });
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6">
        <Link href="/resa/explore" className="text-sm font-medium text-slate-500 hover:text-[#0C1A3D]">← Explorar</Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tema da comunidade</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0C1A3D]">{data?.topic ? "#" + data.topic.name : "#" + slug}</h1>
        <p className="mt-2 text-sm text-slate-500">Publicações públicas associadas a este tema.</p>
      </header>
      {!data && !error && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">A carregar publicações…</p>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {data && data.contents.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Ainda não existem publicações públicas neste tema.</p>}
      {data?.contents.map((content) => <FeedCard key={content.id} content={content} />)}
    </main>
  );
}
