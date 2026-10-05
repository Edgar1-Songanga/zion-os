"use client";

import { useEffect, useRef, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import ResaIcon from "./core/ResaIcon";

const types = [
  { value: "text", label: "Publicação", icon: "sparkles" },
  { value: "prayer", label: "Oração", icon: "prayer" },
  { value: "bible_study", label: "Estudo bíblico", icon: "story" },
] as const;

const mediaAccept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

export default function CreatePost({ onPublished }: { onPublished?: () => void }) {
  const [body, setBody] = useState("");
  const [type, setType] = useState<"text" | "prayer" | "bible_study">("text");
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!media) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(media);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [media]);

  function selectMedia(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Escolha uma imagem ou vídeo compatível.");
      return;
    }
    if (file.size > MAX_MEDIA_SIZE) {
      setError("O ficheiro ultrapassa o limite de 50 MB.");
      return;
    }
    setError(null);
    setMedia(file);
  }

  async function publish() {
    if ((!body.trim() && !media) || saving) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("A sessão RESA não está disponível.");

      let mediaPayload: { media_type: "image" | "video"; media_url: string; media_path: string } | null = null;
      if (media) {
        const extension = media.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("resa-media").upload(path, media, {
          contentType: media.type,
          upsert: false,
        });
        if (upload.error) throw new Error(upload.error.message);
        const publicUrl = supabase.storage.from("resa-media").getPublicUrl(path).data.publicUrl;
        mediaPayload = {
          media_type: media.type.startsWith("video/") ? "video" : "image",
          media_url: publicUrl,
          media_path: path,
        };
      }

      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({
          type,
          body: body.trim() || null,
          visibility: "public",
          language: "pt",
          ...(mediaPayload ?? {}),
        }),
      });

      setBody("");
      setType("text");
      setMedia(null);
      onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Partilhar</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">O que deseja partilhar?</h2>
          </div>
          <span className="hidden rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:block">Comunidade global</span>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva uma mensagem, testemunho, reflexão ou pedido de oração…"
          className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-[15px] leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C1A3D]/30 focus:bg-white focus:ring-4 focus:ring-[#0C1A3D]/5"
          maxLength={10000}
        />

        {preview && media?.type.startsWith("image/") && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <img src={preview} alt="Pré-visualização da publicação" className="max-h-[420px] w-full object-contain" />
          </div>
        )}
        {preview && media?.type.startsWith("video/") && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <video src={preview} controls playsInline className="max-h-[420px] w-full" />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {types.map((item) => {
              const active = type === item.value;
              return (
                <button key={item.value} type="button" onClick={() => setType(item.value)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${active ? "border-[#0C1A3D] bg-[#0C1A3D] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <ResaIcon name={item.icon} size={15} />
                  {item.label}
                </button>
              );
            })}
            <input ref={inputRef} type="file" accept={mediaAccept} className="hidden" onChange={(e) => selectMedia(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
              <ResaIcon name="send" size={15} />
              Imagem / vídeo
            </button>
            {media && (
              <button type="button" onClick={() => setMedia(null)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
                Remover media
              </button>
            )}
          </div>

          <button type="button" onClick={() => void publish()} disabled={saving || (!body.trim() && !media)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0C1A3D] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40">
            <ResaIcon name="send" size={15} />
            {saving ? "A publicar…" : "Publicar"}
          </button>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
