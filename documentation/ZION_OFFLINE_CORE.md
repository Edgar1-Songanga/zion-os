# ZION Offline Core

## Scope

This is the shared browser persistence and synchronization primitive for administrative modules. It is not a generic offline replica of the Supabase database and does not bypass RLS.

Each department must supply:
- its own input validation and domain-specific payload schema;
- an authenticated sender using the current user's access token;
- server-side authorization and organization-membership checks;
- an idempotent write endpoint or RPC;
- a revision/version check using `baseVersion`, returning `conflict` rather than silently overwriting newer data.

## Storage and isolation

- IndexedDB is scoped by user ID, organization ID and device ID.
- Payloads are encrypted with a non-extractable AES-GCM key stored in IndexedDB.
- Metadata is visible locally to support queue status and troubleshooting; business payloads are encrypted.
- Account removal from a device must call `clearOfflineScope`.
- A change of user or organization must create a different scope and must never replay another scope's queue.

## Queue states

- `queued`: waiting for network or retry window.
- `syncing`: being sent.
- `synced`: server confirmed the operation.
- `needs_attention`: a version conflict requires user review.
- `rejected`: server rejected the operation; the user or administrator must correct it.

The queue uses the operation UUID as its idempotency key. A server endpoint must persist and enforce that key before the module is enabled for offline writes.

## Security boundaries

The generic queue refuses pastoral, prayer and personal ministry follow-up modules, and refuses any operation explicitly marked sensitive. Those domains require a separate, consent-aware design and must not be copied into the generic offline store.

Final financial postings, payroll approval, official votes, governance decisions and other irreversible approvals remain online-only. Departments must not enqueue those actions.

The client-side scope is an isolation aid, not an authorization boundary. Every server request must revalidate the session, membership, organization and permission using the user's JWT and existing RLS policies. Never use a service-role key to make offline synchronization succeed.

## Runtime integration

Call `syncOfflineOperations` after authentication is confirmed, when the app regains focus, and after the browser `online` event. Background Sync may be added as an enhancement, but must not be the only retry mechanism because support differs across mobile browsers.

Do not automatically merge conflicts. Present the local draft and current server version, then require an explicit user resolution. Keep the local operation in `needs_attention` until resolved or discarded.

## Current implementation boundary

This PR establishes the encrypted queue and sync engine only. It does not yet wire every administrative form, service worker app-shell caching, server idempotency endpoints, or department-specific conflict screens. Those are subsequent integration stages and must be completed before describing ZION as fully offline-capable.
