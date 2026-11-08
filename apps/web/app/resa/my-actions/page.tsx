"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Action = {
  id: string;
  content_id: string;
  action_type: "content_removed" | "formal_warning";
  reason: string;
  status: "active" | "revoked" | "expired";
  created_at: string;
  revoked_at?: string | null;
  revocation_note?: string | null;
};
type Appeal = {
  id: string;
  action_id: string;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "upheld" | "overturned";
  decision_note?: string | null;
  created_at: string;
};
const actionNames = { content_removed: "Publicação removida", formal_warning: "Advertência formal" };
const statusNames = { active: "Em vigor", revoked: "Revogada", expired: "Expirada" };
const appealNames = { open: "Recebido", reviewing: "Em análise", upheld: "Sanção mantida", overturned: "Sanção anulada" };

export default function MyActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [actionRows, appealRows] = await Promise.all([
        resaRequest<Action[]>("/v1/resa/moderation/my-actions?limit=100"),
        resaRequest<Appeal[]>("/v1/resa/moderation/my-content-appeals?limit=100"),
      ]);
      setActions(actionRows);
      setAppeals(appealRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as medidas aplicadas à conta.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(action: Action) {
    const reason = (reasons[action.id] ?? "").trim();
    const extra = (details[action.id] ?? "").trim();
    if (reason.length < 10) { setError("O motivo do recurso deve ter pelo menos 10 caracteres."); return; }
    setBusy(action.id); setError(""); setNotice("");
    try {
      await resaRequest(`/v1/resa/moderation/actions/${encodeURIComponent(action.id)}/appeals`, {
        method: "POST", body: JSON.stringify({ reason, details: extra }),
      });
      setNotice("O recurso foi enviado. A medida será revista por outro moderador.");
      setExpanded(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o recurso.");
    } finally { setBusy(null); }
  }

  const appealByAction = new Map(appeals.map((appeal) => [appeal.action_id, appeal]));
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl bg-[#0C1A3D] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · DIREITOS DO MEMBRO</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Medidas aplicadas à minha conta</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Consulta as medidas de moderação, os respetivos fundamentos e o resultado dos recursos. Uma remoção de publicação pode ser contestada uma vez.</p>
        </header>
        <div className="flex justify-between"><a href="/resa/settings/notifications" className="text-sm font-semibold text-slate-600">← Definições</a><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar</button></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        <section className="space-y-4">
          {actions.map((action) => {
            const appeal = appealByAction.get(action.id);
            return <article key={action.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-400">{actionNames[action.action_type]}</p><p className="mt-1 text-xs text-slate-400">Data: {new Date(action.created_at).toLocaleString("pt-PT")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusNames[action.status]}</span></div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Fundamentação</p><p className="mt-2 text-sm leading-6 text-slate-700">{action.reason}</p></div>
              {appeal ? <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="flex justify-between gap-2"><p className="text-xs font-semibold uppercase text-indigo-700">Recurso</p><span className="text-xs font-semibold text-indigo-800">{appealNames[appeal.status]}</span></div><p className="mt-2 text-sm text-slate-700">{appeal.reason}</p>{appeal.details && <p className="mt-2 text-sm text-slate-600">{appeal.details}</p>}{appeal.decision_note && <div className="mt-3 border-t border-indigo-100 pt-3"><p className="text-xs font-semibold text-indigo-700">Fundamentação da decisão</p><p className="mt-1 text-sm text-slate-700">{appeal.decision_note}</p></div>}</div> : action.status === "active" && action.action_type === "content_removed" ? <div className="mt-4">{expanded === action.id ? <div className="space-y-3 rounded-xl border border-slate-200 p-4"><label htmlFor={`reason-${action.id}`} className="block text-xs font-semibold text-slate-700">Motivo do recurso</label><textarea id={`reason-${action.id}`} rows={3} maxLength={2000} value={reasons[action.id] ?? ""} onChange={(e) => setReasons((v) => ({ ...v, [action.id]: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Explica por que consideras que a remoção deve ser revista."/><label htmlFor={`details-${action.id}`} className="block text-xs font-semibold text-slate-700">Elementos adicionais (opcional)</label><textarea id={`details-${action.id}`} rows={2} maxLength={5000} value={details[action.id] ?? ""} onChange={(e) => setDetails((v) => ({ ...v, [action.id]: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm"/><div className="flex gap-2"><button type="button" disabled={busy !== null} onClick={() => void submit(action)} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === action.id ? "A enviar…" : "Enviar recurso"}</button><button type="button" onClick={() => setExpanded(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancelar</button></div></div> : <button type="button" onClick={() => setExpanded(action.id)} className="rounded-xl border border-[#0C1A3D] px-4 py-2 text-sm font-semibold text-[#0C1A3D]">Contestar remoção</button>}</div> : null}
            </article>;
          })}
          {!actions.length && !error && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Não existem medidas de moderação associadas à tua conta.</div>}
        </section>
      </div>
    </main>
  );
}
