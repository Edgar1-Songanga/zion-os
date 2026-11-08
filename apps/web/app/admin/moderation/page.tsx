"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Report = {
  id: string;
  reporter_id: string;
  content_id: string | null;
  message_id: string | null;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

const statuses = [
  { value: "open", label: "Abertas" },
  { value: "reviewing", label: "Em análise" },
  { value: "resolved", label: "Resolvidas" },
  { value: "dismissed", label: "Dispensadas" },
];

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await resaRequest<Report[]>(`/v1/resa/moderation/reports?status=${status}&limit=100`);
      setReports(rows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sem acesso à fila de moderação.");
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function action(id: string, nextStatus: "reviewing" | "resolved" | "dismissed") {
    if (busyId) return;
    const reviewNote = (notes[id] ?? "").trim();
    if (nextStatus !== "reviewing" && !reviewNote) {
      setError("Regista uma nota de decisão antes de resolver ou dispensar a denúncia.");
      return;
    }
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await resaRequest("/v1/resa/moderation/reports/" + encodeURIComponent(id), {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, review_note: reviewNote }),
      });
      setNotice("A decisão de moderação foi registada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a denúncia.");
    } finally {
      setBusyId(null);
    }
  }

  async function applyContentAction(report: Report, actionType: "content_removed" | "formal_warning") {
    if (!report.content_id || busyId) return;
    const reason = (actionReasons[report.id] ?? "").trim();
    if (reason.length < 10) { setError("A fundamentação da medida deve ter pelo menos 10 caracteres."); return; }
    setBusyId(report.id); setError(""); setNotice("");
    try {
      await resaRequest(`/v1/resa/moderation/content/${encodeURIComponent(report.content_id)}/actions`, {
        method: "POST", body: JSON.stringify({ action_type: actionType, reason }),
      });
      setNotice(actionType === "content_removed" ? "Publicação removida. O autor pode consultar e contestar a medida no seu histórico." : "Advertência formal registada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível aplicar a medida.");
    } finally { setBusyId(null); }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-[#0C1A3D] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · SEGURANÇA</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Moderação da comunidade</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Rever denúncias, registar decisões e manter um histórico claro da análise. O acesso é limitado a moderadores autorizados.</p>
        </header>

        <div className="flex flex-wrap justify-end gap-2"><Link href="/admin/moderation/appeals" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Reapreciação de denúncias</Link><Link href="/admin/moderation/content-appeals" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Recursos contra sanções</Link></div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button key={item.value} type="button" onClick={() => setStatus(item.value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === item.value ? "bg-[#0C1A3D] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar fila</button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        <div className="space-y-4">
          {reports.map((report) => {
            const target = report.content_id ? "Publicação" : "Mensagem";
            const targetId = report.content_id ?? report.message_id ?? "";
            return (
              <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{report.reason.replaceAll("_", " ")} · {report.status}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{target} reportada · referência {targetId.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-400">Recebida em {new Date(report.created_at).toLocaleString("pt-PT")}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Denúncia {report.id.slice(0, 8)}</span>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">{report.details || "O denunciante não acrescentou detalhes."}</p>
                </div>
                {report.review_note && <div className="mt-3 rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Nota da decisão anterior</p><p className="mt-2 text-sm text-slate-700">{report.review_note}</p></div>}
                {report.content_id && (report.status === "open" || report.status === "reviewing") && <div className="mt-4 space-y-3 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-600">Medidas sobre a publicação</p>
                  <textarea aria-label="Fundamentação da medida" value={actionReasons[report.id] ?? ""} onChange={(event) => setActionReasons((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={2000} rows={2} placeholder="Descreve a regra violada e a razão proporcional da medida." className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyId !== null || (actionReasons[report.id] ?? "").trim().length < 10} onClick={() => void applyContentAction(report, "content_removed")} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Remover publicação</button>
                    <button type="button" disabled={busyId !== null || (actionReasons[report.id] ?? "").trim().length < 10} onClick={() => void applyContentAction(report, "formal_warning")} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-40">Emitir advertência</button>
                  </div>
                </div>}
                {status === "open" || status === "reviewing" ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-600" htmlFor={`review-${report.id}`}>Nota de análise / decisão</label>
                    <textarea id={`review-${report.id}`} value={notes[report.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={2000} rows={3} placeholder="Regista o fundamento da decisão, a medida tomada ou o motivo para encerrar a denúncia." className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0C1A3D]" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busyId !== null} onClick={() => void action(report.id, "reviewing")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{busyId === report.id ? "A guardar…" : "Manter em análise"}</button>
                      <button type="button" disabled={busyId !== null || !(notes[report.id] ?? "").trim()} onClick={() => void action(report.id, "resolved")} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Resolver</button>
                      <button type="button" disabled={busyId !== null || !(notes[report.id] ?? "").trim()} onClick={() => void action(report.id, "dismissed")} className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-40">Dispensar</button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!reports.length && !error && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Não existem denúncias neste estado.</div>}
        </div>
      </div>
    </main>
  );
}
