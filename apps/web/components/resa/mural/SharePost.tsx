"use client";

import { useState } from "react";

interface SharePostProps { postId: string; title?: string; }

async function copyShareUrl(url: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const field = document.createElement("textarea");
  field.value = url;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  if (!copied) throw new Error("Este navegador não permite copiar a ligação automaticamente.");
}

export default function SharePost({ postId, title = "Publicação ZION" }: SharePostProps) {
  const [feedback, setFeedback] = useState("");

  async function sharePost() {
    const url = new URL("/resa", window.location.origin);
    url.searchParams.set("post", postId);
    setFeedback("");

    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: url.toString() });
        setFeedback("Ligação partilhada.");
      } else {
        await copyShareUrl(url.toString());
        setFeedback("Ligação copiada. Já pode colá-la na aplicação que pretende.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(error instanceof Error ? error.message : "Não foi possível partilhar esta publicação.");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void sharePost()}
        className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
      >
        ↗ Partilhar {title}
      </button>
      {feedback && <p role="status" aria-live="polite" className="max-w-xs text-xs text-slate-600">{feedback}</p>}
    </div>
  );
}
