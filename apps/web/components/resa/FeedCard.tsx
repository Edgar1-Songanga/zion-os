"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "./core/ResaIcon";

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

type CommentItem = {
  id: string;
  content?: string | null;
  body?: string | null;
  author_id?: string;
  created_at: string;
};

const typeMeta: Record<string, { label: string; icon: "sparkles" | "prayer" | "story" }> = {
  text: { label: "Publicação", icon: "sparkles" },
  prayer: { label: "Oração", icon: "prayer" },
  bible_study: { label: "Estudo bíblico", icon: "story" },
  testimony: { label: "Testemunho", icon: "heart" },
  sermon: { label: "Sermão", icon: "story" },
};

export default function FeedCard({ content }: { content: ResaContent }) {
  const [reaction, setReaction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);

  const meta = typeMeta[content.type] ?? typeMeta.text;

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
        body: JSON.stringify({ body: comment.trim(), content: comment.trim() }),
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
              <h3 className="font-semibold text-[#0C1A3D]">Membro RESA</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                <ResaIcon name={meta.icon} size={12} />
                {meta.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{new Date(content.created_at).toLocaleString("pt-PT")}</p>
          </div>
        </header>

        <div className="mt-6">
          {content.title && <h4 className="mb-2 text-lg font-semibold tracking-tight text-[#0C1A3D]">{content.title}</h4>}
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{content.body}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-7">
        <button type="button" onClick={() => void toggleReaction()} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          reaction ? "bg-[#0C1A3D] text-white" : "text-slate-600 hover:bg-white hover:text-[#0C1A3D]"
        }`}>
          <ResaIcon name="heart" size={16} />
          {reaction ? "Gostei" : "Curtir"}
        </button>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="bookmark" size={16} />
          {saving ? "A guardar…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="comment" size={16} />
          Comentar {comments.length ? `(${comments.length})` : ""}
        </button>
        <button type="button" onClick={() => void repost()} disabled={reposting} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0C1A3D]">
          <ResaIcon name="repost" size={16} />
          {reposting ? "A repostar…" : "Repostar"}
        </button>
      </div>

      {showComments && (
        <div className="border-t border-slate-100 bg-white px-6 py-5 sm:px-7">
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submitComment(); }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#0C1A3D]/30 focus:bg-white"
              placeholder="Escreva um comentário…"
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
