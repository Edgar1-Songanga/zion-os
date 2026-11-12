import { createClient } from "@/lib/supabase/client";
import {
  discardOfflineOperation,
  enqueueOfflineOperation,
  getOfflineDeviceId,
  listOfflineOperationsWithPayload,
  syncOfflineOperations,
  type OfflineOperationStatus,
  type OfflineScope,
} from "@/lib/offline/offline-core";
import { ResaApiError, resaRequest } from "@/lib/resa/api";

export type SecretariatMemberDraft = {
  member_number?: string | null;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  baptism_date?: string | null;
  membership_status?: string;
  joined_on?: string | null;
  notes?: string | null;
};

export async function getSecretariatOfflineScope(organizationId: string): Promise<OfflineScope> {
  if (!organizationId) throw new Error("Selecciona uma organização antes de activar a sincronização.");
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user?.id) {
    throw new Error("É necessária uma sessão autenticada para utilizar os rascunhos offline.");
  }
  return {
    userId: data.session.user.id,
    organizationId,
    deviceId: await getOfflineDeviceId(),
  };
}

export async function enqueueSecretariatMemberDraft(input: {
  scope: OfflineScope;
  entityId: string;
  action: "create" | "update";
  expectedVersion: number | null;
  payload: SecretariatMemberDraft;
}) {
  if (input.action === "update" &&
      (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion ?? 0) < 1)) {
    throw new Error("Não é possível guardar a alteração offline sem a versão mais recente do registo.");
  }

  const operationId = await enqueueOfflineOperation(input.scope, {
    userId: input.scope.userId,
    organizationId: input.scope.organizationId,
    module: "church.members",
    entityId: input.entityId,
    operation: input.action,
    baseVersion: input.expectedVersion,
    payload: input.payload,
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("zion:offline-queue-changed"));
  return operationId;
}

export async function discardSecretariatMemberDraft(scope: OfflineScope, operationId: string) {
  const discarded = await discardOfflineOperation(scope, operationId);
  if (discarded && typeof window !== "undefined") window.dispatchEvent(new Event("zion:offline-queue-changed"));
  return discarded;
}

export async function listSecretariatMemberDrafts(
  scope: OfflineScope,
  statuses: OfflineOperationStatus[] = ["queued", "syncing", "needs_attention", "rejected"],
) {
  const operations = await listOfflineOperationsWithPayload<SecretariatMemberDraft>(scope, statuses);
  return operations.filter(operation => operation.module === "church.members");
}

export async function syncSecretariatMemberDrafts(scope: OfflineScope) {
  return syncOfflineOperations(scope, async operation => {
    if (operation.module !== "church.members" ||
        (operation.operation !== "create" && operation.operation !== "update")) {
      return { status: "rejected", message: "Operação não suportada pelo registo da Secretaria." };
    }

    if (operation.operation === "update" && typeof operation.baseVersion !== "number") {
      return { status: "rejected", message: "A alteração não contém a versão de origem." };
    }

    try {
      await resaRequest(
        `/v1/organizations/${encodeURIComponent(scope.organizationId)}/church-members/offline-sync`,
        {
          method: "POST",
          body: JSON.stringify({
            operationId: operation.idempotencyKey,
            entityId: operation.entityId,
            action: operation.operation,
            expectedVersion: operation.baseVersion,
            payload: operation.payload,
          }),
        },
      );
      return { status: "synced" };
    } catch (error) {
      if (error instanceof ResaApiError && error.status === 409) {
        return { status: "conflict", message: error.message };
      }
      if (error instanceof ResaApiError && [400, 401, 403, 422].includes(error.status)) {
        return { status: "rejected", message: error.message };
      }
      // Network failures, missing endpoint during staged deployment and 5xx
      // remain queued for retry; do not discard the user's encrypted draft.
      throw error;
    }
  }, "church.members");
}
