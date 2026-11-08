"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CreatePost from "./CreatePost";
import FeedCard from "./FeedCard";
import ResaIcon from "./core/ResaIcon";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/i18n";

type FeedPage = { items: ResaContent[]; next_cursor: string | null; has_more: boolean };
type FeedMode = "for_you" | "following" | "latest";

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
  viewer_reacted?: boolean;
  viewer_saved?: boolean;
  reaction_count?: number;
  comment_count?: number;
  share_count?: number;
  feed_item_id?: string;
  feed_item_type?: "content" | "repost";
  is_repost?: boolean;
  reposted_by_id?: string | null;
  reposted_by_display_name?: string | null;
  viewer_reposted?: boolean;
};

function newestFirst(items: ResaContent[]): ResaContent[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

export default function ResaLiveFeed() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ResaContent[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>("for_you");
  const pendingModeRef = useRef<FeedMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const deepLinkHandledRef = useRef<string | null>(null);

  const load = useCallback(async (silent = false, requestedMode: FeedMode = feedMode) => {
    // Keep at most one request active; if the user switches tabs mid-request,
    // remember the latest mode and load it immediately after the current request.
    if (inFlightRef.current) {
      pendingModeRef.current = requestedMode;
      return;
    }
    inFlightRef.current = true;

    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const latest = await resaRequest<FeedPage>(`/v1/resa/feed?limit=30&mode=${requestedMode}`);
      setItems(latest.items);
      setNextCursor(latest.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("feedLoadError"));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
      const pendingMode = pendingModeRef.current;
      pendingModeRef.current = null;
      if (pendingMode && pendingMode !== requestedMode) void load(true, pendingMode);
    }
  }, [t, feedMode]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || inFlightRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    inFlightRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await resaRequest<FeedPage>(
        `/v1/resa/feed?limit=30&mode=${feedMode}&before=${encodeURIComponent(nextCursor)}`,
      );
      setItems((current) => {
        const known = new Set(current.map((item) => item.feed_item_id || item.id));
        return [...current, ...page.items.filter((item) => !known.has(item.feed_item_id || item.id))];
      });
      setNextCursor(page.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("feedLoadError"));
    } finally {
      loadingMoreRef.current = false;
      inFlightRef.current = false;
      setLoadingMore(false);
      const pendingMode = pendingModeRef.current;
      pendingModeRef.current = null;
      if (pendingMode && pendingMode !== feedMode) void load(true, pendingMode);
    }
  }, [feedMode, nextCursor, t, load]);

  useEffect(() => {
    void load();

    // Keep the feed fresh without repeatedly waking the API for background tabs.
    // A single in-flight guard prevents overlapping requests on slow mobile links.
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const interval = window.setInterval(refreshWhenVisible, 15_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("pageshow", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshWhenVisible);
    };
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("resa-public-mural")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resa_contents", filter: "visibility=eq.public" },
        () => {
          // Re-fetch through the authenticated API so profile details, visibility
          // rules and ranking metadata remain consistent with the normal feed path.
          if (document.visibilityState === "visible") void load(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    const postId = new URLSearchParams(window.location.search).get("post");
    if (!postId || deepLinkHandledRef.current === postId) return;

    const scrollToPublication = () => {
      window.setTimeout(() => {
        document.getElementById("resa-post-" + postId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    };

    const existing = items.find((item) => item.id === postId);
    if (existing) {
      deepLinkHandledRef.current = postId;
      scrollToPublication();
      return;
    }

    deepLinkHandledRef.current = postId;
    void resaRequest<ResaContent>("/v1/resa/content/" + encodeURIComponent(postId))
      .then((publication) => {
        setItems((current) => newestFirst([publication, ...current.filter((item) => item.id !== publication.id)]));
        scrollToPublication();
      })
      .catch(() => {
        // The publication may have been removed or may not be visible to this account.
      });
  }, [items, loading]);

  return (
    <div className="space-y-6">
      <CreatePost onPublished={() => void load(true)} />

      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t("now")}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">{t("communityWall")}</h2>
          <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Tipo de feed">
            <button type="button" aria-pressed={feedMode === "for_you"} onClick={() => setFeedMode("for_you")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${feedMode === "for_you" ? "bg-white text-[#0C1A3D] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Para si</button>
            <button type="button" aria-pressed={feedMode === "following"} onClick={() => setFeedMode("following")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${feedMode === "following" ? "bg-white text-[#0C1A3D] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>A seguir</button>
            <button type="button" aria-pressed={feedMode === "latest"} onClick={() => setFeedMode("latest")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${feedMode === "latest" ? "bg-white text-[#0C1A3D] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Mais recentes</button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-[#0C1A3D] disabled:opacity-50"
        >
          <ResaIcon name="message" size={15} />
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
            {t("tryAgain")}
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0C1A3D]">
            <ResaIcon name="message" size={20} />
          </div>
          <h3 className="mt-4 font-semibold text-[#0C1A3D]">{t("emptyWallTitle")}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t("emptyWallDescription")}</p>
        </div>
      )}

      {!loading && !error && items.map((item) => <FeedCard key={item.feed_item_id || item.id} content={item} />)}

      {!loading && !error && nextCursor && (
        <div className="flex justify-center pb-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#0C1A3D] shadow-sm transition hover:border-slate-300 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? "A carregar…" : "Carregar mais publicações"}
          </button>
        </div>
      )}
    </div>
  );
}
