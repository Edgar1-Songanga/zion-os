"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function CreateCommunity({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function createCommunity() {
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError(true);
      setMessage("Defina um nome com pelo menos dois caracteres.");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(false);
    const baseSlug = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "comunidade";
    const slug = baseSlug + "-" + crypto.randomUUID().slice(0, 8);
    try {
      await resaRequest("/v1/resa/communities", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          slug,
          description: description.trim() || null,
          visibility: "public",
        }),
      });
      setName("");
      setDescription("");
      setMessage("Comunidade criada e disponível na rede RESA.");
      onCreated?.();
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Não foi possível criar a comunidade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Comunidades</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Criar comunidade</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Crie um espaço público para reunir pessoas em torno de uma igreja, ministério, pequeno grupo ou interesse comum.</p>
      <div className="mt-6 grid gap-4">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="Nome da comunidade" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0C1A3D]/40" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} placeholder="Descreva o propósito desta comunidade" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0C1A3D]/40" />
      </div>
      {message && <p role={error ? "alert" : "status"} className={error ? "mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" : "mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700"}>{message}</p>}
      <button disabled={saving} onClick={() => void createCommunity()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{saving ? "A criar…" : "Criar comunidade"}</button>
    </section>
  );
}
