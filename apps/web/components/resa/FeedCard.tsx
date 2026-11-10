"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { resolveResaMediaUrl } from "@/lib/resa/media";
import ResaIcon from "./core/ResaIcon";
import { useTranslation } from "@/components/i18n";

type ResaContent = {
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
  reaction_count?: number;
  comment_count?: number;
  share_count?: number;
  feed_item_id?: string;
  is_repost?: boolean;
  reposted_by_id?: string | null;
  reposted_by_display_name?: string | null;
  viewer_reposted?: boolean;
  is_institutional?: boolean;
  institution_name?: string;
  institution_type?: string;
  ministry_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  meeting_day?: number | null;
  meeting_time?: string | null;
  room_label?: string | null;
  activity_type?: string | null;
  institutional_status?: string | null;
};

type CommentItem = {
  id: string;
  content?: string | null;
  body?: string | null;
  author_id?: string;
  created_at: string;
};

const typeMeta: Record<string, { labelKey: "post" | "prayer" | "bibleStudy" | "testimony" | "sermon"; icon: "message" | "prayer" | "story" | "heart" }> = {
  text: { labelKey: "post", icon: "message" },
  prayer: { labelKey: "prayer", icon: "prayer" },
  bible_study: { labelKey: "bibleStudy", icon: "story" },
  testimony: { labelKey: "testimony", icon: "heart" },
  sermon: { labelKey: "sermon", icon: "story" },
};

function renderLinkedText(value: string) {
  return value.split(/(https?:\/\/[^\s]+|#[\p{L}\p{N}_-]{2,80})/gu).map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return <a key={index} href={part} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline underline-offset-2 hover:text-sky-900">{part}</a>;
    }
    if (part.startsWith("#")) {
      return <Link key={index} href={"/resa/topics/" + encodeURIComponent(part.slice(1).toLowerCase())} className="font-semibold text-indigo-700 underline-offset-2 hover:underline">{part}</Link>;
    }
    return part;
  });
}

export default function FeedCard({ content }: { content: ResaContent }) {
  const { t, locale } = useTranslation();
  const [mediaUrl, setMediaUrl] = useState<string | null>(content.media_url ?? null);
  const [reaction, setReaction] = useState(Boolean(content.viewer_reacted));
  const [saved, setSaved] = useState(Boolean(content.viewer_saved));
  const [reactionCount, setReactionCount] = useState(content.reaction_count ?? 0);
  const [commentCount, setCommentCount] = useState(content.comment_count ?? 0);
  const [shareCount, setShareCount] = useState(content.share_count ?? 0);
  const [alreadyReposted, setAlreadyReposted] = useState(Boolean(content.viewer_reposted));
  const [saving, setSaving] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [reposting, setReposting] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const reactionBusyRef = useRef(false);
  const saveBusyRef = useRef(false);
  const commentBusyRef = useRef(false);
  const repostBusyRef = useRef(false);
  const commentsLoadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setMediaUrl(content.media_url ?? null);
    if (!content.media_url && content.media_type) {
      void resolveResaMediaUrl(content.id).then((url) => {
        if (active && url) setMediaUrl(url);
      });
    }
    return () => { active = false; };
  }, [content.id, content.media_url, content.media_type]);

  const meta = typeMeta[content.type] ?? typeMeta.text;
  const shareTitle = content.title?.trim() || t("publicationOnResa");
  const shareText = content.body?.trim() ? `${shareTitle} — ${content.body.trim().slice(0, 180)}` : shareTitle;
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/resa?post=${encodeURIComponent(content.id)}`
    : `/resa?post=${encodeURIComponent(content.id)}`;

  async function copyShareLink() {
    const absoluteUrl = new URL(shareUrl, window.location.origin).toString();
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(absoluteUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = absoluteUrl;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("clipboard_unavailable");
      }
      setShareFeedback(t("copied"));
    } catch {
      setShareFeedback(absoluteUrl);
    }
  }

  async function nativeShare() {
    setShareFeedback("");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: new URL(shareUrl, window.location.origin).toString() });
        setShareFeedback(t("share"));
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyShareLink();
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
    setReaction(Boolean(content.viewer_reacted));
    setSaved(Boolean(content.viewer_saved));
    setReactionCount(content.reaction_count ?? 0);
    setCommentCount(content.comment_count ?? 0);
    setShareCount(content.share_count ?? 0);
    setAlreadyReposted(Boolean(content.viewer_reposted));
  }, [content.id, content.viewer_reacted, content.viewer_saved, content.reaction_count, content.comment_count, content.share_count, content.viewer_reposted]);

  useEffect(() => {
    if (!showComments || commentsLoadedRef.current) return;
    commentsLoadedRef.current = true;
    void resaRequest<CommentItem[]>("/v1/resa/content/" + content.id + "/comments")
      .then((items) => { setComments(items); setCommentCount((current) => Math.max(current, items.length)); })
      .catch(() => { commentsLoadedRef.current = false; });
  }, [content.id, showComments]);

  async function toggleReaction() {
    if (reactionBusyRef.current) return;
    reactionBusyRef.current = true;
    const previous = reaction;
    const next = !previous;
    setReaction(next);
    setReactionCount((current) => Math.max(0, current + (next ? 1 : -1)));
    setActionFeedback(null);
    try {
      await resaRequest("/v1/resa/content/" + content.id + "/reactions", next
        ? { method: "POST", body: JSON.stringify({ reaction_type: "like" }) }
        : { method: "DELETE" });
      setActionFeedback(next ? "Gostaste desta publicação." : "Gosto removido.");
    } catch (error) {
      setReaction(previous);
      setReactionCount((current) => Math.max(0, current + (previous ? 1 : -1)));
      setActionFeedback(error instanceof Error ? error.message : "Não foi possível registar a reação.");
    } finally {
      reactionBusyRef.current = false;
    }
  }

  async function save() {
    if (saveBusyRef.current) return;
    saveBusyRef.current = true;
    const previous = saved;
    const next = !previous;
    setSaving(true);
    setSaved(next);
    setActionFeedback(null);
    try {
      await resaRequest("/v1/resa/content/" + content.id + "/save", { method: next ? "POST" : "DELETE" });
      setActionFeedback(next ? "Publicação guardada." : "Publicação removida dos guardados.");
    } catch (error) {
      setSaved(previous);
      setActionFeedback(error instanceof Error ? error.message : "Não foi possível guardar a publicação.");
    } finally {
      setSaving(false);
      saveBusyRef.current = false;
    }
  }

  async function submitComment() {
    const value = comment.trim();
    if (!value || commentBusyRef.current) return;
    commentBusyRef.current = true;
    setActionFeedback(null);
    try {
      const created = await resaRequest<CommentItem>("/v1/resa/content/" + content.id + "/comments", {
        method: "POST",
        body: JSON.stringify({ body: value }),
      });
      setComments((current) => [created, ...current]);
      setCommentCount((current) => current + 1);
      commentsLoadedRef.current = true;
      setComment("");
      setShowComments(true);
      setActionFeedback("Comentário publicado.");
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : "Não foi possível publicar o comentário.");
    } finally {
      commentBusyRef.current = false;
    }
  }

  async function submitReport() {
    if (reporting) return;
    setReporting(true);
    setActionFeedback(null);
    try {
      await resaRequest("/v1/resa/moderation/reports", {
        method: "POST",
        body: JSON.stringify({
          content_id: content.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      setShowReport(false);
      setReportDetails("");
      setActionFeedback("Denúncia enviada à equipa de moderação para análise.");
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : "Não foi possível enviar a denúncia.");
    } finally {
      setReporting(false);
    }
  }

  async function repost() {
    if (repostBusyRef.current) return;
    repostBusyRef.current = true;
    setReposting(true);
    setActionFeedback(null);
    try {
      await resaRequest(`/v1/resa/content/${content.id}/repost`, {
        method: "POST",
        body: JSON.stringify({ quote: false }),
      });
      setShareCount((current) => current + 1);
      setAlreadyReposted(true);
      setActionFeedback("Publicação republicada no teu mural.");
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : "Não foi possível partilhar a publicação.");
    } finally {
      setReposting(false);
      repostBusyRef.current = false;
    }
  }

  return (
    <article id={`resa-post-${content.feed_item_id || content.id}`} className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="p-6 sm:p-7">
        <header className="flex items-start gap-4">
          {content.is_institutional ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#102653] text-sm font-bold text-white shadow-sm">
              {(content.institution_name || "I").trim().slice(0, 1).toUpperCase()}
            </div>
          ) : content.author_avatar_url ? (
            <img src={content.author_avatar_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C1A3D] text-sm font-bold text-white shadow-sm">
              {(content.author_display_name || "M").trim().slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {content.is_institutional ? (
                <span className="font-semibold text-[#0C1A3D]">{content.institution_name || "Instituição"}</span>
              ) : (
                <Link
                  href={"/resa/profile/" + encodeURIComponent(content.author_id)}
                  className="font-semibold text-[#0C1A3D] underline-offset-4 hover:underline"
                  aria-label="Abrir perfil do membro"
                >
                  {content.author_display_name?.trim() || t("resaProfile")}
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {content.is_institutional ? "Publicação institucional" : <><ResaIcon name={meta.icon} size={12} />{t(meta.labelKey as Parameters<typeof t>[0])}</>}
              </span>
            </div>
            {content.is_institutional && content.ministry_name && <p className="mt-1 text-xs font-medium text-slate-500">{content.ministry_name}</p>}
            <p className="mt-1 text-xs text-slate-400">{new Date(content.created_at).toLocaleString(locale)}</p>
          </div>
        </header>

        <div className="mt-6">
          {content.title && <h4 className="mb-2 text-lg font-semibold tracking-tight text-[#0C1A3D]">{content.title}</h4>}
          {content.body && <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{renderLinkedText(content.body)}</p>}
          {content.is_institutional && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-600">
              {content.type === "institutional_class" && typeof content.meeting_day === "number" && (
                <span className="rounded-lg bg-white px-3 py-2 font-medium">Sábado / Dia: {["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][content.meeting_day] || "Dia definido pela igreja"}</span>
              )}
              {content.meeting_time && <span className="rounded-lg bg-white px-3 py-2 font-medium">Hora: {content.meeting_time.slice(0, 5)}</span>}
              {content.room_label && <span className="rounded-lg bg-white px-3 py-2 font-medium">Local: {content.room_label}</span>}
              {content.starts_at && <span className="rounded-lg bg-white px-3 py-2 font-medium">Início: {new Date(content.starts_at).toLocaleString(locale)}</span>}
              {content.ends_at && <span className="rounded-lg bg-white px-3 py-2 font-medium">Fim: {new Date(content.ends_at).toLocaleString(locale)}</span>}
              {content.location && <span className="rounded-lg bg-white px-3 py-2 font-medium">Local: {content.location}</span>}
              <span className="ml-auto self-center text-[10px] font-semibold uppercase tracking-wide text-blue-700">Gerido no ZION</span>
            </div>
          )}
          {content.media_type === "image" && mediaUrl && (
            <img src={mediaUrl} alt={content.title || t("publishedOnResa")} loading="lazy" className="mt-4 max-h-[620px] w-full rounded-2xl object-cover" />
          )}
          {content.media_type === "video" && mediaUrl && (
            <video src={mediaUrl} controls playsInline preload="metadata" className="mt-4 max-h-[620px] w-full rounded-2xl bg-slate-950" />
          )}
        </div>
      </div>

      {!content.is_institutional && <div className="relative flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-7">
        <Link href={"/resa/messages?to=" + encodeURIComponent(content.author_id)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]"><ResaIcon name="message" size={16} />{t("message")}</Link>
        <Link href={"/resa/messages?to=" + encodeURIComponent(content.author_id) + "&call=audio"} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]" aria-label={t("call")}><span aria-hidden="true">☎</span>{t("call")}</Link>
        <button type="button" onClick={() => void toggleReaction()} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          reaction ? "bg-[#0C1A3D] text-white" : "text-slate-600 hover:bg-white hover:text-[#0C1A3D]"
        }`}>
          <ResaIcon name="heart" size={16} />
          {reaction ? t("liked") : t("like")}
          {reactionCount > 0 && <span className="text-xs tabular-nums opacity-75">{reactionCount}</span>}
        </button>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="bookmark" size={16} />
          {saving ? t("saving") : saved ? "Guardado" : t("save")}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="comment" size={16} />
          Comentar {commentCount > 0 ? `(${commentCount})` : ""}
        </button>
        <button type="button" onClick={() => void repost()} disabled={reposting || alreadyReposted} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="repost" size={16} />
          {reposting ? t("reposting") : alreadyReposted ? "Republicado" : t("repost")}
          {shareCount > 0 && <span className="text-xs tabular-nums opacity-75">{shareCount}</span>}
        </button>
        <button type="button" onClick={() => { setShowShare((v) => !v); setShowReport(false); setShareFeedback(""); }} className="inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" aria-expanded={showShare}>
          <ResaIcon name="share" size={17} />
          Partilhar
        </button>
        <button type="button" onClick={() => { setShowReport((v) => !v); setShowShare(false); }} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-red-700" aria-expanded={showReport}>
          Denunciar
        </button>

        {showReport && (
          <div className="absolute bottom-full right-4 z-30 mb-3 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <h3 className="text-sm font-semibold text-[#0C1A3D]">Denunciar publicação</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">A denúncia é privada e será analisada pela equipa de moderação.</p>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Motivo
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700">
                <option value="spam">Spam ou fraude</option>
                <option value="harassment">Assédio ou intimidação</option>
                <option value="hate">Discurso de ódio</option>
                <option value="sexual">Conteúdo sexual inadequado</option>
                <option value="violence">Violência ou ameaça</option>
                <option value="misinformation">Informação enganosa</option>
                <option value="copyright">Violação de direitos de autor</option>
                <option value="other">Outro motivo</option>
              </select>
            </label>
            <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Contexto adicional (opcional)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowReport(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">Cancelar</button>
              <button type="button" disabled={reporting} onClick={() => void submitReport()} className="rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{reporting ? "A enviar…" : "Enviar denúncia"}</button>
            </div>
          </div>
        )}

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
              <button type="button" onClick={() => void copyShareLink()} className="text-xs font-semibold text-[#0C1A3D]">{t("copyLink")}</button>
              {shareFeedback && <span className="text-xs text-slate-400">{shareFeedback}</span>}
            </div>
          </div>
        )}
      </div>}

      {actionFeedback && <p role="status" aria-live="polite" className="border-t border-slate-100 bg-blue-50 px-6 py-2.5 text-xs text-[#0C1A3D] sm:px-7">{actionFeedback}</p>}

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
