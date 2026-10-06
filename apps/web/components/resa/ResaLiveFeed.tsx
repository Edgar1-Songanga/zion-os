"use client";

import { useCallback, useEffect, useState } from "react";
import CreatePost from "./CreatePost";
import FeedCard from "./FeedCard";
import ResaIcon from "./core/ResaIcon";
import { resaRequest } from "@/lib/resa/api";
import { useTranslation } from "@/components/i18n";

type ResaContent = {
  id: string;
  author_id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  visibility: string;
  language: string;
  created_at: string;
  media_type?: "image" | "video" | null;
  media_url?: string | null;
};

export default function ResaLiveFeed() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ResaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await resaRequest<ResaContent[]>("/v1/resa/feed?limit=30"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("feedLoadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-6">
      <CreatePost onPublished={() => void load(true)} />

      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t("now")}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">{t("communityWall")}</h2>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-[#0C1A3D] disabled:opacity-50"
        >
          <ResaIcon name="sparkles" size={15} />
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-7">
              <div className="h-10 w-10 rounded-2xl bg-slate-100" />
              <div className="mt-5 h-4 w-40 rounded bg-slate-100" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-[28px] border border-red-200 bg-white p-6">
          <p className="font-semibold text-red-800">{t("wallUpdateError")}</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white">
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0C1A3D]">
            <ResaIcon name="sparkles" size={20} />
          </div>
          <h3 className="mt-4 font-semibold text-[#0C1A3D]">{t("emptyWallTitle")}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t("emptyWallDescription")}</p>
        </div>
      )}

      {!loading && !error && items.map((item) => <FeedCard key={item.id} content={item} />)}
    </div>
  );
}
