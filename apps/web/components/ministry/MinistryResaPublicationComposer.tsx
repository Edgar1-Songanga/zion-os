"use client";

import { useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";

type Visibility = "organization" | "public";

type Props = {
  ministryId: string;
  organizationId: string;
  ministryName: string;
};

export default function MinistryResaPublicationComposer({ ministryId, organizationId, ministryName }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("organization");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle && !cleanBody) {
      setError("Escreva um título ou conteúdo antes de publicar.");
      return;
    }
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await resaRequest("/v1/resa/content", {
        method: "POST",
        body: JSON.stringify({
          type: "article",
          title: cleanTitle || null,
          body: cleanBody || null,
          visibility,
          language: "pt-AO",
          organization_id: organizationId,
          ministry_id: ministryId,
          scripture_references: [],
        }),
      });
      setTitle("");
      setBody("");
      setNotice(visibility === "public"
        ? "Publicação enviada para o feed público do RESA e associada ao ministério."
        : "Publicação criada e visível para a comunidade da organização.");
    } catch (reason) {
      setError(reason instanceof Error
        ? reason.message
        : "Não foi possível publicar. Confirme se tem autorização para representar este ministério.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D4AF37]/30 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A7625]">Publicação institucional</p>
        <h2 className="mt-2 text-lg font-semibold text-[#0C1A3D]">Partilhar no RESA</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Crie uma publicação associada a {ministryName}. Apenas dirigentes autorizados deste ministério
          ou administradores da organização podem publicar; a permissão é validada no servidor.
        </p>
      </div>

      <form onSubmit={publish} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Título da publicação"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Conteúdo
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="Partilhe uma notícia, reflexão, convite ou actividade do ministério."
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20"
          />
        </label>
        <label className="block max-w-xs text-sm font-medium text-slate-700">
          Visibilidade
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as Visibility)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8A24A]"
          >
            <option value="organization">Apenas a organização</option>
            <option value="public">Público no RESA</option>
          </select>
        </label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || (!title.trim() && !body.trim())}
            className="rounded-xl bg-[#0C1A3D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182c58] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "A publicar…" : "Publicar no RESA"}
          </button>
        </div>
      </form>
    </section>
  );
}
