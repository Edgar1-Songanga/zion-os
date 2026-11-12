# Secretariat offline synchronization contract

The first server-side adapter for the shared ZION Offline Core is the official church member register.

## Endpoint

`POST /v1/organizations/:organizationId/church-members/offline-sync`

Bearer authentication is mandatory. Request body:

```json
{
  "operationId": "client-generated UUID",
  "entityId": "client-generated UUID",
  "action": "create",
  "expectedVersion": null,
  "payload": {
    "first_name": "Ana",
    "last_name": "Silva"
  }
}
```

For updates, use `action: "update"` and the latest `row_version` read from the server as `expectedVersion`. The member list response now includes `row_version`.

## Guarantees

- The API validates the current user and the member payload.
- The database RPC runs as SECURITY INVOKER using the user's JWT.
- The RPC checks `church.members.manage` and is subject to the existing RLS policies.
- Idempotency receipt and member mutation commit in the same database transaction.
- Replaying the same operation ID for the same actor and organization returns the original result.
- Reusing an operation ID for a different entity/action is rejected.
- Updates compare `row_version`; stale writes return HTTP 409 with the current server record.
- The row-version trigger increments the version for every update, including normal online edits.
- The existing audit triggers continue to observe member inserts and updates.

## Client requirements

The offline client must create stable UUIDs for both `operationId` and `entityId`, persist them with the encrypted queued operation, and send them unchanged on every retry. A create must not generate a new entity ID on retry.

For update operations, save the server's `row_version` as `baseVersion`. On HTTP 409, retain the local draft and require the user to compare it with the returned current server record. Never automatically overwrite or merge.

This endpoint only covers member register create/update. Removal, transfer, baptism, family relationships and other department workflows remain online-only until their own transactional adapters are implemented. Do not route sensitive pastoral follow-ups through this endpoint.

## Deployment gate

The migration `20261112200000_secretariat_offline_sync.sql` must be applied before this API code is deployed. No production migration or deployment is performed by this PR.
