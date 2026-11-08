"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type Appeal = {
  id: string;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "upheld" | "overturned";
  decision_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};
type Report = {
  id: string;
  content_id: string | null;
  message_id: string | null;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  appeal: Appeal | null;
};

const reportLabels: Record<string, string> = {
  open: "Recebida", reviewing: "Em análise", resolved: "Resolvida", dismissed: "Não acolhida",
};
const appealLabels: Record<string, string> = {
  open: "Pedido recebido", reviewing: "Em reapreciação", upheld: "Decisão mantida", overturned: "Decisão alterada",
};

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [detailsById, setDetailsById] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await resaRequest<Report[]>("/v1/resa/moderation/my-reports?limit=100");
      setReports(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as denúncias.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submitAppeal(report: Report) {
    const reason = (reasonById[report.id] ?? "").trim();
    const details = (detailsById[report.id] ?? "").trim();
    if (reason.length < 10) {
      setError("Explica o motivo da reapreciação com pelo menos 10 caracteres.");
      return;
    }
    setBusy(report.id);
    setError("");
    setNotice("");
    try {
      await resaRequest(`/v1/resa/moderation/reports/${encodeURIComponent(report.id)}/appeals`, {
        method: "POST",
        body: JSON.stringify({ reason, details }),
      });
      setNotice("O pedido de reapreciação foi registado.");
      setExpanded(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o pedido.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl bg-[#0C1A3D] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · TRANSPARÊNCIA</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">As minhas denúncias</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Acompanha o estado das denúncias que apresentaste, consulta a fundamentação da decisão e pede uma reapreciação quando o processo estiver concluído.</p>
        </header>
        <div className="flex items-center justify-between gap-3">
          <Link href="/resa" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Voltar ao RESA</Link>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar</button>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        <section className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{report.reason.replaceAll("_", " ")}</p>
                  <h2 className="mt-1 font-semibold text-slate-900">{report.content_id ? "Publicação denunciada" : "Mensagem denunciada"}</h2>
                  <p className="mt-1 text-xs text-slate-400">Enviada em {new Date(report.created_at).toLocaleString("pt-PT")}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{reportLabels[report.status]}</span>
              </div>
              {report.details && <p className="mt-3 text-sm leading-6 text-slate-600">{report.details}</p>}
              {report.review_note && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Fundamentação da decisão</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.review_note}</p></div>}
              {report.appeal ? (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold uppercase text-indigo-700">Reapreciação</p><span className="text-xs font-semibold text-indigo-800">{appealLabels[report.appeal.status]}</span></div>
                  <p className="mt-2 text-sm text-slate-700">{report.appeal.reason}</p>
                  {report.appeal.details && <p className="mt-2 text-sm text-slate-600">{report.appeal.details}</p>}
                  {report.appeal.decision_note && <div className="mt-3 border-t border-indigo-100 pt-3"><p className="text-xs font-semibold text-indigo-700">Decisão da reapreciação</p><p className="mt-1 text-sm text-slate-700">{report.appeal.decision_note}</p></div>}
                </div>
              ) : report.status === "resolved" || report.status === "dismissed" ? (
                <div className="mt-4">
                  {expanded === report.id ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor={`appeal-reason-${report.id}`}>Por que motivo pedes reapreciação?</label>
                      <textarea id={`appeal-reason-${report.id}`} value={reasonById[report.id] ?? ""} onChange={(e) => setReasonById((v) => ({ ...v, [report.id]: e.target.value }))} maxLength={2000} rows={3} placeholder="Explica de forma objetiva o que consideras que deve ser revisto." className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                      <label className="block text-xs font-semibold text-slate-700" htmlFor={`appeal-details-${report.id}`}>Informação adicional (opcional)</label>
                      <textarea id={`appeal-details-${report.id}`} value={detailsById[report.id] ?? ""} onChange={(e) => setDetailsById((v) => ({ ...v, [report.id]: e.target.value }))} maxLength={5000} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void submitAppeal(report)} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === report.id ? "A enviar…" : "Enviar reapreciação"}</button><button type="button" onClick={() => setExpanded(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancelar</button></div>
                    </div>
                  ) : <button type="button" onClick={() => setExpanded(report.id)} className="rounded-xl border border-[#0C1A3D] px-4 py-2 text-sm font-semibold text-[#0C1A3D]">Pedir reapreciação</button>}
                </div>
              ) : null}
            </article>
          ))}
          {!reports.length && !error && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Ainda não apresentaste denúncias.</div>}
        </section>
      </div>
    </main>
  );
}
