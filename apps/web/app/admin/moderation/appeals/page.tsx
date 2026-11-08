"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Appeal = {
  id: string;
  report_id: string;
  appellant_id: string;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "upheld" | "overturned";
  decision_note?: string | null;
  created_at: string;
};
const filters = [
  { value: "open", label: "Novos" },
  { value: "reviewing", label: "Em análise" },
  { value: "upheld", label: "Decisão mantida" },
  { value: "overturned", label: "Decisão alterada" },
];

export default function ModerationAppealsPage() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await resaRequest<Appeal[]>(`/v1/resa/moderation/appeals?status=${status}&limit=100`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sem acesso à fila de reapreciação.");
    }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, next: "reviewing" | "upheld" | "overturned") {
    if (busy) return;
    const note = (notes[id] ?? "").trim();
    if (next !== "reviewing" && !note) {
      setError("A decisão final exige fundamentação.");
      return;
    }
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await resaRequest(`/v1/resa/moderation/appeals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, decision_note: note }),
      });
      setNotice("A reapreciação foi atualizada.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar a decisão.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-[#0C1A3D] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · SEGURANÇA</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Reapreciação de denúncias</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Esta fila exige uma segunda análise. O sistema impede que o mesmo moderador que decidiu a denúncia original conclua a reapreciação.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => <button key={f.value} type="button" onClick={() => setStatus(f.value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === f.value ? "bg-[#0C1A3D] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{f.label}</button>)}
          <button type="button" onClick={() => void load()} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar</button>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        <section className="space-y-4">
          {rows.map((row) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold uppercase text-slate-400">Pedido {row.id.slice(0, 8)} · denúncia {row.report_id.slice(0, 8)}</p><span className="text-xs font-semibold text-slate-600">{row.status}</span></div>
            <p className="mt-3 text-sm leading-6 text-slate-800">{row.reason}</p>
            {row.details && <p className="mt-2 text-sm text-slate-600">{row.details}</p>}
            <p className="mt-2 text-xs text-slate-400">Apresentado em {new Date(row.created_at).toLocaleString("pt-PT")}</p>
            {row.status === "open" || row.status === "reviewing" ? <div className="mt-4 space-y-3">
              <label htmlFor={`appeal-note-${row.id}`} className="block text-xs font-semibold text-slate-600">Fundamentação da reapreciação</label>
              <textarea id={`appeal-note-${row.id}`} value={notes[row.id] ?? ""} onChange={(e) => setNotes((v) => ({ ...v, [row.id]: e.target.value }))} maxLength={2000} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Regista a análise independente e a fundamentação." />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy !== null} onClick={() => void decide(row.id, "reviewing")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manter em análise</button>
                <button type="button" disabled={busy !== null || !(notes[row.id] ?? "").trim()} onClick={() => void decide(row.id, "upheld")} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Manter decisão original</button>
                <button type="button" disabled={busy !== null || !(notes[row.id] ?? "").trim()} onClick={() => void decide(row.id, "overturned")} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40">Alterar decisão</button>
              </div>
            </div> : row.decision_note && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Decisão</p><p className="mt-2 text-sm text-slate-700">{row.decision_note}</p></div>}
          </article>)}
          {!rows.length && !error && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Não existem pedidos neste estado.</div>}
        </section>
      </div>
    </main>
  );
}
