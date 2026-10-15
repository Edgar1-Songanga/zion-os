"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type IdentityStatus = {
  is_founder: boolean;
  verification_status: "not_verified" | "pending" | "verified" | "rejected" | "suspended";
  verification_type: string | null;
  verified_at: string | null;
};

const labels: Record<IdentityStatus["verification_status"], string> = {
  not_verified: "Não verificada",
  pending: "Em análise",
  verified: "Verificada",
  rejected: "Pedido recusado",
  suspended: "Verificação suspensa",
};

export default function VerificationCenter() {
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [requestedType, setRequestedType] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStatus() {
    try {
      const current = await resaRequest<IdentityStatus>("/v1/identity/verification");
      setStatus(current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o estado de verificação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadStatus(); }, []);

  async function requestVerification() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await resaRequest("/v1/identity/verification/requests", {
        method: "POST",
        body: JSON.stringify({ requested_type: requestedType }),
      });
      setMessage("Pedido registado. O estado será atualizado quando houver uma decisão de revisão.");
      await loadStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  const isVerified = status?.verification_status === "verified";
  const hasPending = status?.verification_status === "pending";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Centro de Verificação</h2>
      <p className="mt-1 text-sm text-slate-500">O estado apresentado é obtido da conta autenticada e da base de dados.</p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Estado da conta</p>
        <p className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
          {isVerified && <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">✓</span>}
          {loading ? "A carregar…" : status ? labels[status.verification_status] : "Estado indisponível"}
        </p>
        {status?.is_founder && <p className="mt-2 text-sm font-medium text-blue-700">Conta do fundador do ZION OS</p>}
        {status?.verified_at && <p className="mt-1 text-xs text-slate-500">Verificada em {new Date(status.verified_at).toLocaleDateString("pt-PT")}</p>}
      </div>

      {!isVerified && !hasPending && (
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="verification-type">Tipo de verificação</label>
          <select id="verification-type" value={requestedType} onChange={(event) => setRequestedType(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <option value="personal">Identidade pessoal</option>
            <option value="professional">Perfil profissional</option>
            <option value="pastor">Pastor / líder espiritual</option>
            <option value="ministry">Ministério</option>
            <option value="organization">Organização</option>
          </select>
          <button type="button" disabled={loading || submitting} onClick={() => void requestVerification()}
            className="rounded-full bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "A registar…" : "Solicitar verificação"}
          </button>
        </div>
      )}

      {hasPending && <p className="mt-5 text-sm text-amber-700">A conta tem uma verificação pendente. Não é necessário enviar outro pedido.</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
