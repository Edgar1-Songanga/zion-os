"use client";

import { FormEvent, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";

type Devotion = {
  id: string; title: string; scriptureReferences: string[]; reflection: string; prayer?: string; completedAt: string;
};

export default function DevotionPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [entries, setEntries] = useState<Devotion[]>([]);
  const [title, setTitle] = useState(""); const [scripture, setScripture] = useState("");
  const [reflection, setReflection] = useState(""); const [prayer, setPrayer] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  async function load(user: string) {
    setLoading(true);
    try { setEntries(await resaRequest<Devotion[]>(`/v1/spiritual/devotion?userId=${encodeURIComponent(user)}&limit=50`)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar as devoções."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void (async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setError("É necessário iniciar sessão."); setLoading(false); return; }
    setUserId(data.user.id); await load(data.user.id);
  })(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId || !title.trim() || !scripture.trim() || !reflection.trim()) return;
    setSaving(true); setError("");
    try {
      const created = await resaRequest<Devotion>("/v1/spiritual/devotion", {
        method: "POST",
        body: JSON.stringify({ userId, title, scriptureReferences: scripture.split(",").map((item) => item.trim()).filter(Boolean), reflection, prayer: prayer.trim() || undefined }),
      });
      setEntries((current) => [created, ...current]); setTitle(""); setScripture(""); setReflection(""); setPrayer("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar a devoção."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[var(--zion-light)] px-4 py-6 sm:px-8"><div className="mx-auto max-w-6xl">
    <section className="relative overflow-hidden rounded-[32px] bg-[var(--zion-primary-deep)] px-6 py-9 text-white shadow-[var(--zion-shadow-lg)] sm:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.2),transparent_40%)]" />
      <div className="relative"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">ZION OS · Spiritual Layer</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Devoção</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">Registe momentos reais de estudo, reflexão e oração. Cada entrada fica associada à sua conta e protegida por RLS.</p></div>
    </section>
    <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submit} className="rounded-[28px] border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">Nova reflexão</p><h2 className="mt-2 text-xl font-semibold text-[var(--zion-primary)]">Concluir uma devoção</h2>
        <div className="mt-6 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Título" className="w-full rounded-2xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          <input value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="Referências bíblicas, separadas por vírgula" className="w-full rounded-2xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} maxLength={10000} rows={7} placeholder="O que aprendeu, compreendeu ou decidiu?" className="w-full resize-y rounded-2xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          <textarea value={prayer} onChange={(e) => setPrayer(e.target.value)} rows={4} placeholder="Oração pessoal (opcional)" className="w-full resize-y rounded-2xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={saving || !title.trim() || !scripture.trim() || !reflection.trim()} className="w-full rounded-2xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-40">{saving ? "A guardar…" : "Guardar devoção"}</button>
        </div>
      </form>
      <section className="rounded-[28px] border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)]">
        <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">Histórico</p><h2 className="mt-2 text-xl font-semibold text-[var(--zion-primary)]">As suas devoções</h2></div><span className="rounded-full border border-[var(--zion-border)] bg-[var(--zion-light)] px-3 py-1 text-xs font-semibold text-[var(--zion-muted)]">{entries.length}</span></div>
        <div className="mt-6 space-y-4">{loading ? <p className="text-sm text-[var(--zion-muted)]">A carregar…</p> : entries.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--zion-border)] px-5 py-10 text-center text-sm text-[var(--zion-muted)]">Ainda não há devoções registadas.</div> : entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)]/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--zion-muted)]">{new Date(entry.completedAt).toLocaleDateString("pt-PT")}</p><h3 className="mt-2 font-semibold text-[var(--zion-dark)]">{entry.title}</h3><p className="mt-2 text-xs font-medium text-[var(--zion-muted)]">{entry.scriptureReferences.join(" · ")}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--zion-muted)]">{entry.reflection}</p></article>)}</div>
      </section>
    </div>
  </div></main>;
}
