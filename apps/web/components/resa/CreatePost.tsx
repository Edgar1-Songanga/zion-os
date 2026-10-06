"use client";

import { useEffect, useRef, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import ResaIcon from "./core/ResaIcon";
import { useTranslation } from "@/components/i18n";

const types = [
  { value: "text", labelKey: "post", icon: "sparkles" },
  { value: "prayer", labelKey: "prayer", icon: "prayer" },
  { value: "bible_study", labelKey: "bibleStudy", icon: "story" },
] as const;

const mediaAccept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

export default function CreatePost({ onPublished }: { onPublished?: () => void }) {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const [type, setType] = useState<"text" | "prayer" | "bible_study">("text");
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
      setError(t("compatibleMedia"));
      return;
    }
    if (file.size > MAX_MEDIA_SIZE) {
      setError(t("mediaTooLarge"));
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
      if (userError || !userData.user) throw new Error(t("sessionUnavailable"));

      let mediaPayload: { media_type: "image" | "video"; media_url: string; media_path: string } | null = null;
      if (media) {
        const extension = media.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error(t("sessionUnavailable"));

        const tusEndpoint = "https://wwdchvadowqakvrxcnkz.storage.supabase.co/storage/v1/upload/resumable";
        const chunkSize = 6 * 1024 * 1024;
        const encodeMetadata = (value: string) => {
          const bytes = new TextEncoder().encode(value);
          let binary = "";
          for (const byte of bytes) binary += String.fromCharCode(byte);
          return btoa(binary);
        };
        const tusMetadata = [
          `bucketName ${encodeMetadata("resa-media")}`,
          `objectName ${encodeMetadata(path)}`,
          `contentType ${encodeMetadata(media.type)}`,
          `cacheControl ${encodeMetadata("3600")}`,
        ].join(",");

        const createResponse = await fetch(tusEndpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionData.session.access_token}`,
            "tus-resumable": "1.0.0",
            "upload-length": String(media.size),
            "upload-metadata": tusMetadata,
            "x-upsert": "false",
          },
        });
        if (!createResponse.ok) {
          throw new Error(`Media upload initialization failed (${createResponse.status})`);
        }

        const uploadUrl = createResponse.headers.get("location");
        if (!uploadUrl) throw new Error("Media upload URL was not returned");

        let offset = 0;
        while (offset < media.size) {
          const end = Math.min(offset + chunkSize, media.size);
          const chunk = media.slice(offset, end);
          let uploaded = false;
          let lastError: Error | null = null;

          for (const delay of [0, 2000, 5000, 10000]) {
            if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
            try {
              const patchResponse = await fetch(uploadUrl, {
                method: "PATCH",
                headers: {
                  authorization: `Bearer ${sessionData.session.access_token}`,
                  "tus-resumable": "1.0.0",
                  "upload-offset": String(offset),
                  "content-type": "application/offset+octet-stream",
                },
                body: chunk,
              });
              if (!patchResponse.ok) {
                throw new Error(`Media upload chunk failed (${patchResponse.status})`);
              }
              const nextOffset = Number(patchResponse.headers.get("upload-offset") ?? end);
              if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
                throw new Error("Media upload returned an invalid offset");
              }
              offset = nextOffset;
              uploaded = true;
              setUploadProgress(Math.round((offset / media.size) * 100));
              break;
            } catch (error) {
              lastError = error instanceof Error ? error : new Error("Media upload failed");
            }
          }

          if (!uploaded) throw lastError ?? new Error("Media upload failed");
        }

        setUploadProgress(null);
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
      setUploadProgress(null);
      setError(e instanceof Error ? e.message : t("publishError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t("share")}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">{t("sharePrompt")}</h2>
          </div>
          <span className="hidden rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:block">{t("globalCommunity")}</span>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("sharePlaceholder")}
          className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-[15px] leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C1A3D]/30 focus:bg-white focus:ring-4 focus:ring-[#0C1A3D]/5"
          maxLength={10000}
        />

        {preview && media?.type.startsWith("image/") && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <img src={preview} alt={t("previewPublication")} className="max-h-[420px] w-full object-contain" />
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
                  {t(item.labelKey as Parameters<typeof t>[0])}
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
            {uploadProgress !== null ? `${t("publishing")} ${uploadProgress}%` : saving ? t("publishing") : t("publish")}
          </button>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
