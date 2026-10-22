# Frame production migration gate — implementation contract

**Status: design/audit only. No production database writes were performed.**

## Current verified gap (2026-10-17)

- `.github/workflows/ci.yml` validates migration filenames and duplicate timestamps; it does not validate migration SQL against a disposable database and does not apply migrations.
- `apps/api/src/audit/audit.module.ts` is currently an empty NestJS module.
- `PlatformModule` exposes platform search, events, analytics and jobs; it is not a migration executor and must not become one by accident.
- The API runtime config contains the Supabase URL and publishable key, not a privileged migration credential.
- Production migration history was previously read-only checked through `20261017151020_department_operations_phase2`. The following repository migrations were not present in that history at the last check:
  - `20261014120000_church_member_transfer_workflow.sql`
  - `20261014130000_church_member_baptism_validation.sql`
  - `20261017170000_fix_spiritual_growth_partial_conflict_target.sql`
  - `20261017180000_fix_spiritual_devotion_optional_created_at.sql`
- Those observations are a reconciliation queue, **not permission to apply them**. Re-check current migration history before any execution.

## Non-negotiable trust boundary

Frame must be the only authorized production-migration entry point. Do not add a direct Supabase SQL/CLI deployment path, API endpoint, Vercel hook, or GitHub workflow that can apply production migrations independently of Frame.

CI may lint and test migrations in a disposable/non-production database. CI passing does not mean production migrations were applied or that authenticated product flows work.

## Required Frame flow

1. **Discover** — enumerate repository migration files and compare them with the production migration ledger using read-only access. Produce a deterministic plan; never infer that a missing ledger row means a migration is safe to run.
2. **Validate** — run syntax/integration tests against a disposable database, including existing-schema compatibility, reruns/idempotency where applicable, grants, RLS and negative authorization tests.
3. **Authorize** — require an authenticated, explicitly authorized operator, production target confirmation, immutable plan hash, and an auditable approval. Never accept a client-supplied role or user ID as proof of privilege.
4. **Execute** — only a Frame-controlled server-side worker may perform a previously approved plan. Use a least-privilege credential held server-side; never expose it to the browser, ordinary API configuration, logs, or responses. Prevent concurrent runs with a lock and persist an idempotent run identifier.
5. **Verify** — check the resulting migration ledger and required schema invariants after execution. If execution partially fails, stop and report the exact migration and state; do not automatically retry non-transactional operations.
6. **Audit** — persist operator identity, target, plan hash, migration versions, timestamps, outcome, verification results and sanitized error details. Audit records must not contain credentials or sensitive row data.
7. **Release gate** — distinguish CI success, Frame execution success, production schema verification, deployment health, and authenticated end-to-end verification as separate statuses.

## Security and reliability requirements

- Default to read-only plan generation; execution must be an explicit, separately authorized action.
- Fail closed on unknown migration state, hash drift, missing approval, missing audit storage, or concurrent execution.
- Pin the approved migration contents by checksum so a plan cannot be changed after approval.
- Never run arbitrary SQL submitted by a user. Frame executes only version-controlled migrations reviewed through GitHub.
- Do not bypass Row Level Security or broaden grants to make a migration pass.
- Keep rollback/compensation explicit. Forward-only migrations may require a reviewed corrective migration rather than destructive rollback.
- Add tests for unauthorized users, expired/invalid approval, changed checksum, duplicate execution, concurrent requests, partial failure, and secret redaction.

## Implementation sequence

1. Inspect the existing identity, governance and audit contracts before choosing the authorization model.
2. Implement Frame as a separate bounded module/service; do not overload Platform or treat the currently empty AuditModule as proof of an existing audit backend.
3. Add unit tests and disposable-database integration tests. Production credentials must not be available to pull-request CI.
4. Add a read-only reconciliation report first. Do not enable production execution until security review, audit persistence, locking, checksums and operator authorization are tested.
5. Reconcile pending migrations one at a time through Frame after the plan is verified; then run authenticated E2E tests for the affected workflows.

## Completion criteria

Frame is not production-ready until the authorization and negative tests pass, a disposable database validates the migration plan, the audit trail is durable, duplicate/concurrent execution is safe, and production schema verification is evidenced separately from CI. No claim of production readiness should be based on a green build alone.
