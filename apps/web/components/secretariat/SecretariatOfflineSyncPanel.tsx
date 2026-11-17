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
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const refreshCallback = useRef(onServerRefresh);
  const contextSequence = useRef(0);
  const running = useRef<number | null>(null);

  useEffect(() => {
    refreshCallback.current = onServerRefresh;
  }, [onServerRefresh]);

  const refreshQueue = useCallback(async (activeScope: OfflineScope, sequence: number) => {
    const items = await listSecretariatMemberDrafts(activeScope);
    if (contextSequence.current === sequence) setDrafts(items);
  }, []);

  const refresh = useCallback(async () => {
    const sequence = contextSequence.current;
    const requestedOrganizationId = organizationId;
    if (!requestedOrganizationId) {
      scopeRef.current = null;
      setDrafts([]);
      return;
    }
    try {
      const nextScope = await getSecretariatOfflineScope(requestedOrganizationId);
      if (contextSequence.current !== sequence || nextScope.organizationId !== requestedOrganizationId) return;
      scopeRef.current = nextScope;
      await refreshQueue(nextScope, sequence);
    } catch (error) {
      if (contextSequence.current !== sequence) return;
      scopeRef.current = null;
      setDrafts([]);
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir a fila offline.");
    }
  }, [organizationId, refreshQueue]);

  const synchronize = useCallback(async () => {
    const sequence = contextSequence.current;
    const requestedOrganizationId = organizationId;
    if (!requestedOrganizationId || !navigator.onLine || running.current === sequence) return;
    running.current = sequence;
    setBusy(true);
    setMessage("");
    try {
      const cachedScope = scopeRef.current;
      const activeScope = cachedScope?.organizationId === requestedOrganizationId
        ? cachedScope
        : await getSecretariatOfflineScope(requestedOrganizationId);
      if (contextSequence.current !== sequence || activeScope.organizationId !== requestedOrganizationId) return;
      scopeRef.current = activeScope;
      const result = await syncSecretariatMemberDrafts(activeScope);
      if (contextSequence.current !== sequence) return;
      await refreshQueue(activeScope, sequence);
      if (contextSequence.current !== sequence) return;
      if (result.synced > 0 || result.needsAttention > 0) refreshCallback.current();
      if (result.synced > 0) {
        setMessage(`${result.synced} registo(s) sincronizado(s) com o servidor.`);
      } else if (result.needsAttention > 0) {
        setMessage("Existem alterações em conflito. O ZION não substituiu os dados do servidor.");
      } else if (result.rejected > 0) {
        setMessage("Algumas operações foram rejeitadas. Consulta o motivo antes de as corrigir.");
      }
    } catch (error) {
      if (contextSequence.current === sequence) setMessage(error instanceof Error ? error.message : "A sincronização não foi concluída.");
    } finally {
      if (running.current === sequence) {
        running.current = null;
        if (contextSequence.current === sequence) setBusy(false);
      }
    }
  }, [organizationId, refreshQueue]);

  useEffect(() => {
    contextSequence.current += 1;
    scopeRef.current = null;
    setDrafts([]);
    setMessage("");
    setBusy(false);
    setDiscardTarget(null);
    setDiscarding(false);
  }, [organizationId]);

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
    setDiscardTarget(operationId);
  }

  async function confirmDiscard() {
    const operationId = discardTarget;
    const activeScope = scopeRef.current;
    const sequence = contextSequence.current;
    if (!operationId || !activeScope || discarding) return;
    setDiscarding(true);
    try {
      const removed = await discardSecretariatMemberDraft(activeScope, operationId);
      if (contextSequence.current !== sequence || scopeRef.current?.organizationId !== activeScope.organizationId) return;
      if (removed) setMessage("Rascunho local descartado.");
      setDiscardTarget(null);
      await refreshQueue(activeScope, sequence);
    } catch (error) {
      if (contextSequence.current === sequence) {
        setMessage(error instanceof Error ? error.message : "Não foi possível descartar o rascunho.");
      }
    } finally {
      if (contextSequence.current === sequence) setDiscarding(false);
    }
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

      {discardTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onKeyDown={event => {
          if (event.key === "Escape" && !discarding) setDiscardTarget(null);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-discard-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h3 id="offline-discard-title" className="text-base font-semibold text-slate-900">Descartar rascunho?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta operação remove o rascunho guardado neste dispositivo. Não será possível recuperar os dados descartados.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={discarding}
                onClick={() => setDiscardTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={discarding}
                onClick={() => void confirmDiscard()}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {discarding ? "A descartar…" : "Sim, descartar"}
              </button>
            </div>
          </section>
        </div>
      )}

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
