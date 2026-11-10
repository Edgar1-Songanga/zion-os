"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type VerificationRequest = {
  id: string;
  user_id: string;
  requested_type: string;
  submitted_at: string;
  evidence_refs: unknown[];
};

const typeLabels: Record<string, string> = {
  personal: "Identidade pessoal",
  professional: "Perfil profissional",
  pastor: "Pastor / líder espiritual",
  ministry: "Ministério",
  organization: "Organização",
  founder: "Fundador do ZION OS",
};

export default function VerificationReviewPanel() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setRequests(await resaRequest<VerificationRequest[]>("/v1/identity/verification/requests/pending"));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(request: VerificationRequest, decision: "approved" | "rejected") {
    if (busyId) return;
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await resaRequest("/v1/identity/verification/requests/" + encodeURIComponent(request.id) + "/review", {
        method: "PATCH",
        body: JSON.stringify({ decision, reason: reasons[request.id] ?? "" }),
      });
      setNotice(decision === "approved" ? "Verificação aprovada." : "Pedido rejeitado.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar a decisão.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-[#0C1A3D] p-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#D4AF37]">Governança de identidade</p>
          <h1 className="mt-2 text-3xl font-bold">Revisão de verificações</h1>
          <p className="mt-2 text-sm text-white/70">Apenas administradores globais verificados podem rever estes pedidos. Cada decisão fica registada no servidor.</p>
        </header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        <section className="space-y-4">
          {loading && <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">A carregar pedidos…</p>}
          {!loading && requests.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Não existem pedidos pendentes.</p>}
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#0C1A3D]">{typeLabels[request.requested_type] ?? request.requested_type}</h2>
                  <p className="mt-1 break-all text-xs text-slate-500">Utilizador: {request.user_id}</p>
                  <p className="mt-1 text-xs text-slate-400">Submetido: {new Date(request.submitted_at).toLocaleString("pt-PT")}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Pendente</span>
              </div>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Nota da revisão (opcional)
                <textarea value={reasons[request.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={1000} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Registe a justificação da decisão." />
              </label>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(request, "rejected")} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">{busyId === request.id ? "A guardar…" : "Rejeitar"}</button>
                <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(request, "approved")} className="rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === request.id ? "A guardar…" : "Aprovar"}</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
