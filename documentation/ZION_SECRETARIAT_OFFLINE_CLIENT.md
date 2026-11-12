# Secretariat offline client integration

The Secretariat member register now opts into the shared Offline Core for member create and update only.

## Behaviour

- If the member create/update request fails because the device is offline or the API transport is unavailable, the form stores an encrypted local operation.
- Create operations receive a stable client-generated member UUID. The same UUID is reused on every retry.
- Update operations require the member's server-provided `row_version`. If that version is unavailable, the client refuses to queue the update rather than guessing.
- The panel shows queued drafts and their state, and retries on browser online, focus, visibility resume and manual request.
- A 409 response becomes `needs_attention`; the server's current record is refreshed, and no local value overwrites it.
- A user may explicitly discard a rejected or conflicting draft. Discard is not automatic.
- The adapter filters by `church.members`; it never processes another department's queue.

## Data boundary

Only member register create/update payloads are queued. Baptism decisions, member transfers, family relationship mutations, status removal, financial actions, governance decisions and pastoral/prayer data remain online-only.

The client does not cache the full member register. It stores only the user's explicit pending operation, encrypted at rest in IndexedDB and isolated by user, organization and device.

## Deployment dependency

The client sync endpoint is introduced by PR #284 and depends on migration `20261112200000_secretariat_offline_sync.sql`. Until that migration and API are deployed, queued operations remain local and retry later; normal online member CRUD continues through the existing endpoints.

This integration is the first department-specific client adapter, not a claim that every Secretariat workflow or every ZION department is offline-enabled.
