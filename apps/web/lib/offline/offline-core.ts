/**
 * ZION Offline Core — encrypted, account/organization/device-scoped operation queue.
 *
 * Departments provide their own payload validation and sender. This module only
 * persists opaque operations, retries transient failures and surfaces conflicts.
 * Sensitive pastoral/ministry data is deliberately excluded from the generic queue.
 */

export type OfflineOperationStatus =
  | "queued"
  | "syncing"
  | "synced"
  | "needs_attention"
  | "rejected";

export type OfflineOperationInput = {
  userId: string;
  organizationId: string;
  module: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  baseVersion?: string | number | null;
  isSensitive?: boolean;
  operationId?: string;
};

export type OfflineOperation = {
  id: string;
  scope: string;
  userId: string;
  organizationId: string;
  module: string;
  entityId: string;
  operation: OfflineOperationInput["operation"];
  baseVersion: string | number | null;
  status: OfflineOperationStatus;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
  iv: string;
  ciphertext: ArrayBuffer;
};

export type OfflineSyncResult =
  | { status: "synced" }
  | { status: "conflict"; message?: string }
  | { status: "rejected"; message: string };

export type OfflineScope = {
  userId: string;
  organizationId: string;
  deviceId: string;
};

const DB_NAME = "zion-offline-core";
const DB_VERSION = 1;
const OPERATIONS = "operations";
const KEYS = "keys";
const META = "meta";
const BLOCKED_MODULES = new Set([
  "pastoral",
  "prayer",
  "prayer_requests",
  "ministry_followups",
  "personal_followups",
]);

function assertBrowserSupport() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("O armazenamento offline não está disponível neste dispositivo.");
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error("A encriptação offline não está disponível neste contexto seguro.");
  }
}

function makeScope(scope: OfflineScope) {
  if (!scope.userId || !scope.organizationId || !scope.deviceId) {
    throw new Error("A sincronização offline exige utilizador, organização e dispositivo.");
  }
  return [scope.userId, scope.organizationId, scope.deviceId].join(":");
}

function openDatabase(): Promise<IDBDatabase> {
  assertBrowserSupport();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OPERATIONS)) {
        const store = db.createObjectStore(OPERATIONS, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
        store.createIndex("scope_status", ["scope", "status"], { unique: false });
      }
      if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS, { keyPath: "scope" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir a base offline."));
    request.onblocked = () => reject(new Error("A base offline está bloqueada por outra janela."));
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha na operação IndexedDB."));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(storeName, mode);
    const completed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Transação offline falhou."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Transação offline cancelada."));
    });
    const result = await work(transaction.objectStore(storeName));
    await completed;
    return result;
  } finally {
    db.close();
  }
}

async function getEncryptionKey(scope: string): Promise<CryptoKey> {
  const existing = await withStore<{ key: CryptoKey } | undefined>(KEYS, "readonly", async store => {
    return requestValue(store.get(scope));
  });
  if (existing?.key) return existing.key;

  // Generate outside the IDB transaction, then re-check under a write lock.
  // Concurrent first writes therefore converge on the first persisted key.
  const candidate = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return withStore<CryptoKey>(KEYS, "readwrite", async store => {
    const current = await requestValue<{ key: CryptoKey } | undefined>(store.get(scope));
    if (current?.key) return current.key;
    await requestValue(store.put({ scope, key: candidate }));
    return candidate;
  });
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function encryptPayload(scope: string, payload: unknown) {
  const key = await getEncryptionKey(scope);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: encodeBase64(iv), ciphertext };
}

async function decryptPayload<T>(record: OfflineOperation): Promise<T> {
  const key = await getEncryptionKey(record.scope);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(record.iv) },
    key,
    record.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function getOfflineDeviceId(): Promise<string> {
  const existing = await withStore<{ key: string; value: string } | undefined>(
    META, "readonly", async store => requestValue(store.get("device-id")),
  );
  if (existing?.value) return existing.value;

  const candidate = crypto.randomUUID();
  return withStore<string>(META, "readwrite", async store => {
    const current = await requestValue<{ key: string; value: string } | undefined>(store.get("device-id"));
    if (current?.value) return current.value;
    await requestValue(store.put({ key: "device-id", value: candidate }));
    return candidate;
  });
}

export async function enqueueOfflineOperation(
  scopeInput: OfflineScope,
  input: OfflineOperationInput,
): Promise<string> {
  const scope = makeScope(scopeInput);
  if (input.userId !== scopeInput.userId || input.organizationId !== scopeInput.organizationId) {
    throw new Error("A operação não corresponde à sessão e organização activas.");
  }
  const moduleName = input.module.trim().toLowerCase();
  if (!moduleName || BLOCKED_MODULES.has(moduleName) || moduleName.startsWith("pastoral_") ||
      moduleName.startsWith("prayer_") || moduleName.startsWith("ministry_followup") || input.isSensitive) {
    throw new Error("Este tipo de informação não pode ser guardado na fila offline genérica.");
  }
  if (!input.entityId || !input.payload || typeof input.payload !== "object") {
    throw new Error("A operação offline não contém entidade ou dados válidos.");
  }

  const encrypted = await encryptPayload(scope, input.payload);
  const now = Date.now();
  const id = input.operationId ?? crypto.randomUUID();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("O identificador da operação offline deve ser um UUID válido.");
  }
  const record: OfflineOperation = {
    id,
    scope,
    userId: input.userId,
    organizationId: input.organizationId,
    module: moduleName,
    entityId: input.entityId,
    operation: input.operation,
    baseVersion: input.baseVersion ?? null,
    status: "queued",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    ...encrypted,
  };
  await withStore(OPERATIONS, "readwrite", async store => {
    await requestValue(store.add(record));
  });
  return id;
}

export async function readOfflineOperationPayload<T>(
  scopeInput: OfflineScope,
  operationId: string,
): Promise<T | null> {
  const scope = makeScope(scopeInput);
  const record = await withStore<OfflineOperation | undefined>(
    OPERATIONS, "readonly", async store => requestValue(store.get(operationId)),
  );
  if (!record || record.scope !== scope) return null;
  return decryptPayload<T>(record);
}

export async function listOfflineOperationsWithPayload<T>(
  scopeInput: OfflineScope,
  statuses?: OfflineOperationStatus[],
  moduleFilter?: string,
): Promise<Array<Omit<OfflineOperation, "ciphertext" | "iv"> & { payload: T }>> {
  const metadata = (await listOfflineOperations(scopeInput, statuses))
    .filter(operation => !moduleFilter || operation.module === moduleFilter);
  const hydrated = await Promise.all(metadata.map(async operation => {
    const payload = await readOfflineOperationPayload<T>(scopeInput, operation.id);
    return payload === null ? null : { ...operation, payload };
  }));
  return hydrated.filter((operation): operation is Omit<OfflineOperation, "ciphertext" | "iv"> & { payload: T } => operation !== null);
}

export async function listOfflineOperations(
  scopeInput: OfflineScope,
  statuses?: OfflineOperationStatus[],
): Promise<Array<Omit<OfflineOperation, "ciphertext" | "iv">>> {
  const scope = makeScope(scopeInput);
  const records = await withStore<OfflineOperation[]>(OPERATIONS, "readonly", async store => {
    return requestValue(store.index("scope").getAll(scope));
  });
  return records
    .filter(record => !statuses?.length || statuses.includes(record.status))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ ciphertext: _ciphertext, iv: _iv, ...metadata }) => metadata);
}

async function updateRecord(id: string, patch: Partial<OfflineOperation>) {
  await withStore(OPERATIONS, "readwrite", async store => {
    const current = await requestValue<OfflineOperation | undefined>(store.get(id));
    if (current) await requestValue(store.put({ ...current, ...patch, updatedAt: Date.now() }));
  });
}

function retryDelay(attempts: number) {
  return Math.min(5 * 60_000, 2_000 * 2 ** Math.min(attempts, 7));
}

/**
 * Runs only for the currently authenticated scope. The supplied sender must
 * revalidate session, organization membership and module permissions server-side.
 * Invoke on app start, focus and the browser "online" event; do not rely solely
 * on Background Sync, which is not supported consistently on mobile browsers.
 */
export async function syncOfflineOperations(
  scopeInput: OfflineScope,
  sender: (operation: {
    idempotencyKey: string;
    module: string;
    entityId: string;
    operation: OfflineOperationInput["operation"];
    baseVersion: string | number | null;
    payload: unknown;
  }) => Promise<OfflineSyncResult>,
  moduleFilter?: string,
): Promise<{ synced: number; needsAttention: number; rejected: number; deferred: number }> {
  const scope = makeScope(scopeInput);
  const records = await withStore<OfflineOperation[]>(OPERATIONS, "readonly", async store => {
    return requestValue(store.index("scope").getAll(scope));
  });
  const now = Date.now();
  // Recover work left in "syncing" by a closed tab or interrupted device.
  const due = records
    .filter(record =>
      (!moduleFilter || record.module === moduleFilter) &&
      ((record.status === "queued" && record.nextAttemptAt <= now) ||
       (record.status === "syncing" && record.updatedAt <= now - 2 * 60_000)),
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  const summary = { synced: 0, needsAttention: 0, rejected: 0, deferred: 0 };
  for (const record of due) {
    // Recheck scope before each network operation; account switching suspends the run.
    if (makeScope(scopeInput) !== record.scope) break;
    await updateRecord(record.id, { status: "syncing" });
    try {
      const payload = await decryptPayload<unknown>(record);
      const result = await sender({
        idempotencyKey: record.id,
        module: record.module,
        entityId: record.entityId,
        operation: record.operation,
        baseVersion: record.baseVersion,
        payload,
      });
      if (result.status === "synced") {
        await updateRecord(record.id, { status: "synced", lastError: undefined });
        summary.synced += 1;
      } else if (result.status === "conflict") {
        await updateRecord(record.id, {
          status: "needs_attention",
          lastError: result.message ?? "O registo foi alterado noutro dispositivo.",
        });
        summary.needsAttention += 1;
      } else {
        await updateRecord(record.id, { status: "rejected", lastError: result.message });
        summary.rejected += 1;
      }
    } catch (error) {
      const attempts = record.attempts + 1;
      await updateRecord(record.id, {
        status: "queued",
        attempts,
        nextAttemptAt: Date.now() + retryDelay(attempts),
        lastError: error instanceof Error ? error.message : "Falha temporária de sincronização.",
      });
      summary.deferred += 1;
    }
  }
  return summary;
}

export async function discardOfflineOperation(
  scopeInput: OfflineScope,
  operationId: string,
): Promise<boolean> {
  const scope = makeScope(scopeInput);
  return withStore<boolean>(OPERATIONS, "readwrite", async store => {
    const record = await requestValue<OfflineOperation | undefined>(store.get(operationId));
    if (!record || record.scope !== scope || record.status === "syncing") return false;
    await requestValue(store.delete(operationId));
    return true;
  });
}

/** Delete local records and their encryption key when an account is removed from this device. */
export async function clearOfflineScope(scopeInput: OfflineScope): Promise<void> {
  const scope = makeScope(scopeInput);
  const db = await openDatabase();
  try {
    const tx = db.transaction([OPERATIONS, KEYS], "readwrite");
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Falha ao limpar dados offline."));
      tx.onabort = () => reject(tx.error ?? new Error("Limpeza offline cancelada."));
    });
    const operations = tx.objectStore(OPERATIONS);
    const records = await requestValue<OfflineOperation[]>(operations.index("scope").getAll(scope));
    records.forEach(record => operations.delete(record.id));
    tx.objectStore(KEYS).delete(scope);
    await completed;
  } finally {
    db.close();
  }
}
