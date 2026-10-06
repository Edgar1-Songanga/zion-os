"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "./core/ResaIcon";
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

type CommentItem = {
  id: string;
  content?: string | null;
  body?: string | null;
  author_id?: string;
  created_at: string;
};

const typeMeta: Record<string, { labelKey: "sparkles" | "prayer" | "story" | "heart" }> = {
  text: { labelKey: "post", icon: "sparkles" },
  prayer: { labelKey: "prayer", icon: "prayer" },
  bible_study: { labelKey: "bibleStudy", icon: "story" },
  testimony: { labelKey: "testimony", icon: "heart" },
  sermon: { labelKey: "sermon", icon: "story" },
};

export default function FeedCard({ content }: { content: ResaContent }) {
  const { t, locale } = useTranslation();
  const [reaction, setReaction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");

  const meta = typeMeta[content.type] ?? typeMeta.text;
  const shareTitle = content.title?.trim() || t("publicationOnResa");
  const shareText = content.body?.trim() ? `${shareTitle} — ${content.body.trim().slice(0, 180)}` : shareTitle;
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/resa?post=${encodeURIComponent(content.id)}`
    : `/resa?post=${encodeURIComponent(content.id)}`;

  async function nativeShare() {
    setShareFeedback("");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShareFeedback(t("share"))
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(t("copied"));
    } catch {
      setShareFeedback(t("copyPrompt"));
    }
  }

  function openExternalShare(network: "whatsapp" | "facebook" | "messenger" | "telegram" | "x") {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const targets = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    };
    window.open(targets[network], "_blank", "noopener,noreferrer");
    setShareFeedback(t("shareWindowOpened"));
  }

  useEffect(() => {
    if (!showComments) return;
    void resaRequest<CommentItem[]>(`/v1/resa/content/${content.id}/comments`).then(setComments).catch(() => {});
  }, [content.id, showComments]);

  async function toggleReaction() {
    try {
      if (reaction) {
        await resaRequest(`/v1/resa/content/${content.id}/reactions`, { method: "DELETE" });
        setReaction(false);
      } else {
        await resaRequest(`/v1/resa/content/${content.id}/reactions`, {
          method: "POST",
          body: JSON.stringify({ reaction_type: "like" }),
        });
        setReaction(true);
      }
    } catch {}
  }

  async function save() {
    setSaving(true);
    try {
      await resaRequest(`/v1/resa/content/${content.id}/save`, { method: "POST" });
    } catch {}
    setSaving(false);
  }

  async function submitComment() {
    if (!comment.trim()) return;
    try {
      const created = await resaRequest<CommentItem>(`/v1/resa/content/${content.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment.trim() }),
      });
      setComments((v) => [created, ...v]);
      setComment("");
      setShowComments(true);
    } catch {}
  }

  async function repost() {
    setReposting(true);
    try {
      await resaRequest(`/v1/resa/content/${content.id}/repost`, {
        method: "POST",
        body: JSON.stringify({ quote: false }),
      });
    } catch {}
    setReposting(false);
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="p-6 sm:p-7">
        <header className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C1A3D] text-sm font-bold text-white shadow-sm">
            {content.author_id.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={"/resa/messages?to=" + encodeURIComponent(content.author_id)}
                className="font-semibold text-[#0C1A3D] underline-offset-4 hover:underline"
                aria-label={t("openConversation")}
              >
                {t("resaProfile")} · {content.author_id.slice(0, 8)}
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                <ResaIcon name={meta.icon} size={12} />
                {t(meta.labelKey as Parameters<typeof t>[0])}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{new Date(content.created_at).toLocaleString(locale)}</p>
          </div>
        </header>

        <div className="mt-6">
          {content.title && <h4 className="mb-2 text-lg font-semibold tracking-tight text-[#0C1A3D]">{content.title}</h4>}
          {content.body && <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{content.body}</p>}
          {content.media_type === "image" && content.media_url && (
            <img src={content.media_url} alt={content.title || t("publishedOnResa")} loading="lazy" className="mt-4 max-h-[620px] w-full rounded-2xl object-cover" />
          )}
          {content.media_type === "video" && content.media_url && (
            <video src={content.media_url} controls playsInline preload="metadata" className="mt-4 max-h-[620px] w-full rounded-2xl bg-slate-950" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-7">
        <Link href={"/resa/messages?to=" + encodeURIComponent(content.author_id)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]"><ResaIcon name="message" size={16} />{t("message")}</Link>
        <Link href={"/resa/messages?to=" + encodeURIComponent(content.author_id)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]" aria-label={t("call")}><span aria-hidden="true">☎</span>{t("call")}</Link>
        <button type="button" onClick={() => void toggleReaction()} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          reaction ? "bg-[#0C1A3D] text-white" : "text-slate-600 hover:bg-white hover:text-[#0C1A3D]"
        }`}>
          <ResaIcon name="heart" size={16} />
          {reaction ? t("liked") : t("like")}
        </button>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="bookmark" size={16} />
          {saving ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="comment" size={16} />
          Comentar {comments.length ? `(${comments.length})` : ""}
        </button>
        <button type="button" onClick={() => void repost()} disabled={reposting} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="repost" size={16} />
          {reposting ? t("reposting") : t("repost")}
        </button>
        <button type="button" onClick={() => { setShowShare((v) => !v); setShareFeedback(""); }} className="inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" aria-expanded={showShare}>
          <ResaIcon name="share" size={17} />
          Partilhar
        </button>

        {showShare && (
          <div className="absolute bottom-full right-4 z-20 mb-3 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="px-2 py-1">
              <p className="text-sm font-semibold text-[#0C1A3D]">{t("sharePublication")}</p>
              <p className="mt-0.5 text-xs text-slate-400">{t("shareBeyondResa")}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => openExternalShare("whatsapp")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">WhatsApp</button>
              <button type="button" onClick={() => openExternalShare("facebook")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Facebook</button>
              <button type="button" onClick={() => openExternalShare("messenger")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Messenger</button>
              <button type="button" onClick={() => openExternalShare("telegram")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Telegram</button>
              <button type="button" onClick={() => openExternalShare("x")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">X</button>
              <button type="button" onClick={() => void nativeShare()} className="rounded-xl bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-[#0C1A3D] hover:bg-slate-100">{t("moreOptions")}</button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 px-2 pt-2">
              <button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => setShareFeedback("Link copiado")).catch(() => setShareFeedback(t("cannotCopy")))} className="text-xs font-semibold text-[#0C1A3D]">{t("copyLink")}</button>
              {shareFeedback && <span className="text-xs text-slate-400">{shareFeedback}</span>}
            </div>
          </div>
        )}
      </div>

      {showComments && (
        <div className="border-t border-slate-100 bg-white px-6 py-5 sm:px-7">
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submitComment(); }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#0C1A3D]/30 focus:bg-white"
              placeholder={t("commentPlaceholder")}
            />
            <button onClick={() => void submitComment()} className="inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white">
              <ResaIcon name="send" size={15} />
              Enviar
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {comments.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {item.content || item.body || ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
