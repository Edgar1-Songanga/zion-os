"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type ResaContent = { id: string; author_id: string; type: string; title?: string | null; body?: string | null; visibility: string; language: string; created_at: string };
type CommentItem = { id: string; content?: string | null; body?: string | null; author_id?: string; created_at: string };

export default function FeedCard({ content }: { content: ResaContent }) {
  const [reaction, setReaction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);

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
        await resaRequest(`/v1/resa/content/${content.id}/reactions`, { method: "POST", body: JSON.stringify({ reaction_type: "like" }) });
        setReaction(true);
      }
    } catch {}
  }

  async function save() {
    setSaving(true);
    try { await resaRequest(`/v1/resa/content/${content.id}/save`, { method: "POST" }); } catch {}
    setSaving(false);
  }

  async function submitComment() {
    if (!comment.trim()) return;
    try {
      const created = await resaRequest<CommentItem>(`/v1/resa/content/${content.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment.trim(), content: comment.trim() }) });
      setComments(v => [created, ...v]);
      setComment("");
      setShowComments(true);
    } catch {}
  }

  async function repost() {
    setReposting(true);
    try { await resaRequest(`/v1/resa/content/${content.id}/repost`, { method: "POST", body: JSON.stringify({ quote: false }) }); } catch {}
    setReposting(false);
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0C1A3D] font-bold text-white">Z</div>
        <div><h3 className="font-bold">ZION Member</h3><p className="text-sm text-slate-500">{new Date(content.created_at).toLocaleString("pt-PT")}</p></div>
      </div>
      <div className="mt-6">{content.title && <h4 className="font-semibold text-[#0C1A3D]">{content.title}</h4>}<p className="whitespace-pre-wrap text-slate-700">{content.body}</p></div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={() => void toggleReaction()} className={`rounded-xl px-4 py-2 ${reaction ? "bg-slate-200" : "bg-slate-100"}`}>👍 {reaction ? "Gostei" : "Curtir"}</button>
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2">{saving ? "…" : "🔖 Guardar"}</button>
        <button type="button" onClick={() => setShowComments(v => !v)} className="rounded-xl bg-slate-100 px-4 py-2">💬 Comentar {comments.length ? `(${comments.length})` : ""}</button>
        <button type="button" onClick={() => void repost()} disabled={reposting} className="rounded-xl bg-slate-100 px-4 py-2">{reposting ? "…" : "↗ Repostar"}</button>
      </div>
      {showComments && <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void submitComment(); }} className="flex-1 rounded-xl border px-4 py-2" placeholder="Escreva um comentário..." />
          <button onClick={() => void submitComment()} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-white">Enviar</button>
        </div>
        <div className="mt-4 space-y-2">{comments.map(item => <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">{item.content || item.body || ""}</div>)}</div>
      </div>}
    </article>
  );
}
