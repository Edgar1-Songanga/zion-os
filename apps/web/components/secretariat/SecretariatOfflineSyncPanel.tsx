"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  discardSecretariatMemberDraft,
  getSecretariatOfflineScope,
  listSecretariatMemberDrafts,
  syncSecretariatMemberDrafts,
} from "@/lib/offline/secretariat-adapter";
import type { OfflineScope } from "@/lib/offline/offline-core";

type Draft = Awaited<ReturnType<typeof listSecretariatMemberDrafts>>[number];

type Props = {
  organizationId: string;
  onServerRefresh: () => void;
};

const STATUS_LABELS: Record<Draft["status"], string> = {
  queued: "A aguardar sincronização",
  syncing: "A sincronizar",
  synced: "Sincronizado",
  needs_attention: "Conflito — revisão necessária",
  rejected: "Rejeitado pelo servidor",
};

export default function SecretariatOfflineSyncPanel({ organizationId, onServerRefresh }: Props) {
  const scopeRef = useRef<OfflineScope | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refreshCallback = useRef(onServerRefresh);
  const running = useRef(false);

  useEffect(() => {
    refreshCallback.current = onServerRefresh;
  }, [onServerRefresh]);

  const refreshQueue = useCallback(async (activeScope: OfflineScope) => {
    const items = await listSecretariatMemberDrafts(activeScope);
    setDrafts(items);
  }, []);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      scopeRef.current = null;
      setDrafts([]);
      return;
    }
    try {
      const nextScope = await getSecretariatOfflineScope(organizationId);
      scopeRef.current = nextScope;
      await refreshQueue(nextScope);
    } catch (error) {
      scopeRef.current = null;
      setDrafts([]);
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir a fila offline.");
    }
  }, [organizationId, refreshQueue]);

  const synchronize = useCallback(async () => {
    if (!organizationId || !navigator.onLine || running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      const activeScope = scopeRef.current ?? await getSecretariatOfflineScope(organizationId);
      scopeRef.current = activeScope;
      const result = await syncSecretariatMemberDrafts(activeScope);
      await refreshQueue(activeScope);
      if (result.synced > 0 || result.needsAttention > 0) refreshCallback.current();
      if (result.synced > 0) {
        setMessage(`${result.synced} registo(s) sincronizado(s) com o servidor.`);
      } else if (result.needsAttention > 0) {
        setMessage("Existem alterações em conflito. O ZION não substituiu os dados do servidor.");
      } else if (result.rejected > 0) {
        setMessage("Algumas operações foram rejeitadas. Consulta o motivo antes de as corrigir.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A sincronização não foi concluída.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [organizationId, refreshQueue]);

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? false : navigator.onLine);
    void refresh().then(() => {
      if (navigator.onLine) void synchronize();
    });
  }, [refresh, synchronize]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void synchronize();
    };
    const handleOffline = () => setOnline(false);
    const handleFocus = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void synchronize();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setOnline(navigator.onLine);
        if (navigator.onLine) void synchronize();
      }
    };
    const handleQueueChange = () => {
      void refresh().then(() => {
        if (navigator.onLine) void synchronize();
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("zion:offline-queue-changed", handleQueueChange);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("zion:offline-queue-changed", handleQueueChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, synchronize]);

  async function discard(operationId: string) {
    const activeScope = scopeRef.current;
    if (!activeScope || !window.confirm("Descartar este rascunho local? Esta acção não pode ser anulada.")) return;
    const removed = await discardSecretariatMemberDraft(activeScope, operationId);
    if (removed) setMessage("Rascunho local descartado.");
    await refreshQueue(activeScope);
  }

  if (!organizationId || (drafts.length === 0 && online && !message)) return null;

  const pending = drafts.filter(draft => draft.status === "queued" || draft.status === "syncing").length;
  const conflicts = drafts.filter(draft => draft.status === "needs_attention").length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0C1A3D]">
            {online ? "Sincronização da Secretaria" : "Modo offline activo"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {online
              ? `${pending} pendente(s) · ${conflicts} conflito(s) por resolver`
              : "Os rascunhos elegíveis ficam encriptados neste dispositivo até a ligação regressar."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void synchronize()}
          disabled={!online || busy || pending === 0}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
        >
          {busy ? "A sincronizar…" : "Sincronizar agora"}
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-slate-600">{message}</p>}

      {drafts.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {drafts.map(draft => (
            <li key={draft.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {draft.payload.first_name ?? "Membro"} {draft.payload.last_name ?? ""}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {draft.operation === "create" ? "Novo registo" : "Alteração"} · {STATUS_LABELS[draft.status]}
                  {draft.lastError ? ` · ${draft.lastError}` : ""}
                </p>
              </div>
              {(draft.status === "needs_attention" || draft.status === "rejected") && (
                <button
                  type="button"
                  onClick={() => void discard(draft.id)}
                  className="w-fit text-xs font-semibold text-red-700 underline-offset-4 hover:underline"
                >
                  Descartar rascunho
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
