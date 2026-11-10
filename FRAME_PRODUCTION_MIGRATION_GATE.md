# Frame — exclusive production migration gate

Frame is the only supported path for applying Supabase production migrations.

## Required repository configuration

Before enabling execution, a repository administrator must configure:

1. GitHub Actions secrets:
   - `ZION_SUPABASE_ACCESS_TOKEN`: Supabase access token scoped to the ZION project.
   - `ZION_SUPABASE_DB_PASSWORD`: production database password.
2. GitHub Actions variable:
   - `ZION_SUPABASE_PROJECT_REF`: exact 20-character production project reference.
3. GitHub Environment `zion-production-migrations`:
   - Require at least one independent reviewer (preferably two) who is not the workflow initiator.
   - Restrict deployment branches to `main`.
   - Do not allow self-review.
4. Remove production database credentials from every unrelated workflow, developer shell automation, Vercel build/deploy hooks, and application runtime. No other workflow may run `supabase db push` against production.
5. Protect `main` with required CI checks and review. Keep production secrets unavailable to pull-request workflows.

The GitHub Environment protection is an administrative setting and cannot be safely inferred from the presence of this workflow. Until it is configured and verified in repository settings, the executor must not be considered production-enabled.

## Operating procedure

### 1. Read-only plan

Dispatch **Frame — exclusive production migrations** from `main` with mode `plan`.

The workflow checks out the exact immutable commit, builds a deterministic manifest with SHA-256 for every migration, binds it to the production project reference and commit SHA, captures the remote ledger, and runs `supabase db push --dry-run --include-all`. It uploads the plan and evidence without changing production.

Review the complete plan and dry-run output. The plan hash is printed in the Actions summary.

### 2. Approved execution

Dispatch the same workflow from the same `main` commit with mode `execute` and the exact reviewed `expected_plan_sha256`.

The executor serializes runs, recomputes and compares the plan hash, repeats the dry-run after the approval gate, waits at the protected `zion-production-migrations` GitHub Environment, rechecks the plan hash after approval, applies migrations using Supabase CLI, captures the resulting ledger, and performs a post-run dry-run.

A changed commit, migration byte, target project, or plan invalidates the approval. Never bypass a failed hash check.

## Safety properties and limitations

- The plan generator is read-only and has no database connection code.
- Pull requests do not receive production credentials.
- The executor runs only from `main`, behind the protected GitHub Environment.
- The workflow is serialized and revalidates the exact plan before execution.
- The CLI migration ledger is checked before and after execution.
- Execution evidence is retained as a GitHub Actions artifact.

The workflow cannot configure GitHub Environment reviewers or remove credentials from other external systems. Those settings must be independently checked before production execution is enabled. Supabase CLI execution is not a substitute for authenticated application E2E, backup verification, or a tested rollback/recovery plan. Investigate failed migrations; do not blindly retry or manually edit the migration ledger.

## Validation

```sh
node --test apps/api/scripts/frame-migration-manifest.test.cjs
node --test apps/api/scripts/frame-production-plan.test.cjs
```

The plan tests are offline and do not access production.
