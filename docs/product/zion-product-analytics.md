# ZION / RESA Product Analytics

**Status:** Instrumentation foundation in progress. This document distinguishes implemented event collection from aggregate metrics that remain gated by the database authorization and migration process.

## Product boundary

Product Analytics measures how people discover, adopt and use ZION OS and RESA. It is not the same as Institutional Intelligence (church, department, ministry and membership indicators) or Platform Operations (uptime, latency, errors and infrastructure).

- **ZION OS:** dashboard, Bible Engine, Bible Quiz, Sabbath School, Devotion and meetings.
- **RESA:** home/feed, Reels, Live, communities, messaging, meetings, events and prayer.

Meeting usage is attributed to the product surface where the user entered the experience. Cross-product reporting must avoid counting one person as two distinct users in the same platform-level total.

## Event contract

Events use the existing `zion_analytics_events` table and store a versioned, low-cardinality product envelope inside `properties` until the governed schema migration is approved.

Required envelope:
- `product_key`: `zion_os` or `resa`.
- `module_key`: a module registered for that product.
- `event_version`: integer version of the event contract.
- `session_id`: random, tab-session identifier; never an account identifier.
- `event_name`: an event from the server-side allowlist.

Initial event taxonomy:
- `page_view`: approved static page key.
- `bible_search_submitted`: success, translation and result count; never the query or verse text.
- `bible_quiz_started`: play mode and level.
- `bible_quiz_level_completed`: play mode and level only. No score, answer, question text or pass/fail data is currently collected.
- `devotion_saved`: event occurrence only; no devotion, prayer, reference or content metadata is currently collected.
- `reel_reaction`: like/unlike action; never content or author ID.
- `live_created`: visibility class only; never title, password or description.

The API validates product/module/event combinations and accepts only event-specific properties. Unknown keys, free text and invalid values are rejected. The event registry is authoritative: metric definitions must not assume attributes that are not explicitly present in that registry. The browser helper sends events asynchronously and does not block product interactions.

## Initial metric catalogue

| Metric | Definition | Availability |
|---|---|---|
| Daily / weekly / monthly active users | Distinct authenticated actors with a valid product event in the period | Awaiting privileged aggregate |
| Active users by product | Distinct actors by `product_key` | Awaiting privileged aggregate |
| Module adoption | Distinct module users / distinct product users in the same period | Awaiting privileged aggregate |
| DAU/WAU/MAU | Daily or weekly active users divided by monthly active users | Awaiting time-series aggregate |
| D1 / D7 / D30 retention | Cohort users returning on the specified elapsed day/window | Awaiting event history |
| Feature funnel | Ordered eligible events / preceding step, with a defined conversion window | Awaiting event history |
| Bible search success | Successful searches / submitted searches | Awaiting sufficient telemetry |
| Bible Quiz completion | Completed-level events / started-level events, grouped by mode and level | Awaiting sufficient telemetry |
| Devotion save rate | Save events / devotion page visits; this is a save proxy, not proof of reading completion | Awaiting sufficient telemetry |
| RESA Reels engagement | Valid reactions / eligible reel impressions | Awaiting impression event contract |
| Live conversion | Joined live sessions / created or scheduled sessions | Awaiting join event coverage |

No metric may be labelled live until its formula, denominator, event coverage, source freshness and access policy are verified.

## Security and privacy

- Current ingestion is authenticated. It attributes events to the verified Supabase actor on the server; the client cannot choose an actor ID.
- Collection is disabled by default. The account privacy preference `product_analytics` must be explicitly enabled; the browser checks the preference and the API independently enforces it against the stored profile.
- Do not collect search text, Bible passage text, prayer/devotion content, message content, email, phone, passwords, meeting titles, content IDs or precise location in Product Analytics.
- Product-level aggregate access must be restricted to verified global administrators. Existing actor-scoped RLS must not be broadened.
- Global aggregate queries require a reviewed database function/read model with explicit `app_metadata` authorization, bounded date windows, suppression for small groups where appropriate, and audit logging.
- Before production rollout, the user-facing privacy notice, purpose limitation, retention period, access audit, and deletion/export workflow must be aligned with the ZION privacy policy. The opt-in is not a substitute for these governance controls.
- Operational logs and analytics events are separate datasets with separate retention and access policies.

## Delivery gates

1. Event registry, safe ingestion validation and first-party instrumentation.
2. Migration and secure aggregate RPC through the existing Frame gate; no direct production SQL or RLS bypass.
3. Product Analytics API with verified global-admin authorization, date filters, time-series, product/module breakdowns, funnels and retention.
4. Premium executive workspace with accessible charts, comparison windows, definitions, data freshness, empty/stale/error states and drill-down only to permitted aggregates.
5. Reconciliation, privacy, cross-role negative tests, performance and production smoke validation.

**Current known limitation:** the production analytics table returned no event rows during the initial read-only audit on 2026-11-23. Historical retention and trend metrics therefore cannot be calculated yet.


## Aggregate read-model contract — next gated implementation

The executive workspace must not read `zion_analytics_events` directly through the Data API. The next database block must introduce a narrow aggregate interface:

- A bounded, read-only RPC for a verified global administrator, checked against server-managed `app_metadata` (`zion_global_role=global_admin` and `zion_verified=true`). Never trust user-editable metadata or client-supplied role claims.
- Keep the existing actor-scoped RLS policy unchanged. Do not add a global-admin row-level SELECT policy and do not expose raw event rows to the browser.
- Return aggregate-only dimensions: product, module, UTC date bucket and event name. Never return actor IDs, session IDs, raw properties or individual event histories.
- Bound the requested window (maximum 90 days per query), page or bucket the result, and apply a minimum cohort threshold before publishing small-group retention or conversion results.
- Calculate DAU/WAU/MAU, product-to-module adoption, D1/D7/D30 cohort retention and supported feature funnels server-side. Every metric must use the registered formula and report its time zone, denominator, freshness and caveats.
- Record aggregate access in the existing audit domain with actor, requested period, filters and metric catalogue version.
- Add query indexes for product/module/time and actor/time access patterns, plus ingestion idempotency and server-side rate limiting. Validate query plans against realistic event volumes.
- Reconcile aggregates against controlled fixtures and negative-test ordinary members, local church administrators, institutional roles and unverified global administrators.

This read model and its SQL migration must be created through the Supabase CLI migration workflow and executed only through Frame after the repository migration ledger and production schema have been reconciled. The current PR deliberately does not bypass that gate.


## Executive workspace UX contract

The central Product Analytics workspace is for verified global administrators and must be a decision surface, not a wall of decorative cards.

1. **Executive overview:** DAU, WAU, MAU, D1/D7/D30 retention and active-product adoption, each with a comparison period, definition tooltip and data-freshness timestamp.
2. **Product comparison:** ZION OS versus RESA, with distinct active users and engagement trends; cross-product unique users are deduplicated by the authenticated actor.
3. **Module adoption:** ranked module usage within each parent product, with denominator and eligible population visible.
4. **Journey funnels:** Bible search, Bible Quiz progression, devotion save, RESA discovery/reaction and Live creation/joining only where every funnel step has validated event coverage.
5. **Retention cohorts:** cohort matrix for D1/D7/D30, with immature cohorts clearly marked and small cohorts suppressed.
6. **Operational quality:** link out to Platform Operations for uptime, API latency and errors; do not mix reliability measures into product engagement KPIs.
7. **Decision context:** show period, timezone, metric definition, source, freshness and limitations beside every chart. Provide explicit empty, insufficient-sample, stale and error states.

Visual direction: restrained premium enterprise interface, strong information hierarchy, low visual noise, compact chart chrome, accessible contrast and keyboard navigation. Mobile should prioritize the executive overview and allow progressive disclosure of detailed analysis. Never use fabricated sample values in a production dashboard.


## Retention, consent withdrawal and deletion lifecycle

This lifecycle is a mandatory release gate, not an assumption that the current event table already implements it.

### Consent state transitions

- **Disabled by default:** no product event may be accepted unless the authenticated profile currently has `privacy.product_analytics = true`.
- **Opt-in:** the API reads the persisted profile preference for every ingestion request. A browser cache is only a convenience and is never authoritative.
- **Withdrawal:** once the stored preference is false, new events are rejected immediately. The browser must refresh consent after a profile privacy update and stop dispatching queued telemetry. A consent withdrawal does **not** currently delete previously collected events; the product must not imply otherwise.
- **Re-enable:** collection resumes only after a new explicit opt-in. No historical events are backfilled.

### Data lifecycle requirements

1. Maintain a documented purpose, lawful basis/consent wording, data owner, retention schedule and deletion SLA before enabling broad collection.
2. Keep event-level rows identifiable only by the server-derived actor while needed for the approved analytics purpose. Do not use session IDs as cross-session identity.
3. Enforce retention with a scheduled, idempotent database-side purge. It must be observable, retryable, auditable and tested against boundary timestamps; a UI-only filter is not deletion.
4. On an approved user erasure/account-deletion request, remove that actor's event-level rows and any actor-linked derived records. Preserve only aggregates that have been irreversibly de-identified and cannot reasonably be linked back to the person; document exceptions required by law or institutional recordkeeping.
5. A consent withdrawal and an erasure request are distinct actions. Provide a clear route to request erasure/export; do not silently treat opt-out as erasure.
6. Backups and replicas must have a defined expiry/rotation policy. A successful primary-table purge must not be represented as immediate removal from every backup.
7. Retention jobs must not delete operational audit evidence or institutional records governed by separate policies. Product Analytics must have its own data lifecycle.
8. Record deletion requests and execution outcomes in a restricted audit trail without copying deleted event payloads into the audit record.

### Decisions that remain intentionally unapproved

No retention duration, legal basis, deletion SLA, minimum cohort threshold or backup expiry is invented in this engineering PR. These values must be approved by the ZION data/privacy owner with legal review for the jurisdictions served, then encoded as versioned policy configuration and database enforcement. Until that approval and implementation exist, Product Analytics remains a controlled engineering foundation and must not be presented as a fully governed production analytics service.

### Required verification before release

- Opt-out rejects ingestion on the next API request, including when the browser still has a stale consent cache.
- Erasure removes all event rows for the verified actor without allowing the actor to delete another user's rows.
- Retention purge is idempotent, bounded, monitored and cannot be invoked by ordinary clients.
- Aggregate outputs are checked for re-identification risk after source-row deletion.
- Backup expiry and audit evidence are verified separately from primary-table deletion.
- User-facing privacy copy accurately distinguishes collection opt-in, withdrawal, export and erasure.


## Production schema audit — 2026-11-23 (read-only)

The connected production project was inspected without changing schema, data, policies or migration history. These observations supersede assumptions based only on repository documentation:

- `public.zion_analytics_events` exists, RLS is enabled, and the table contained **0 rows** at audit time.
- Current columns are `id`, `event_name`, `actor_user_id`, `entity_type`, `entity_id`, `properties`, `occurred_at` and `created_at`. Product, module, event version and session ID are currently carried inside validated JSONB properties, not dedicated relational columns.
- Current RLS policies allow authenticated inserts only when `actor_user_id = auth.uid()`, and selects only for the same actor. There is no DELETE policy in the inspected policy set. Do not broaden these policies for executive analytics.
- Current indexes include primary key, `(event_name, occurred_at DESC)`, `(actor_user_id, occurred_at DESC)` and `(entity_type, entity_id, occurred_at DESC)`. There is no dedicated product/module/time index in the inspected index set.
- The actor foreign key currently uses `ON DELETE SET NULL`. Consequently, deleting an auth user does **not** erase that user's event rows; it nulls the actor reference and leaves the event payload in place. This does not meet the erasure requirement in this specification.
- The production migration ledger currently ends at `20261113095841` (`resa_call_alert_lifecycle_cleanup`). No Product Analytics aggregate, retention or erasure migration is recorded after it in the connected ledger.

### Consequences and next database change set

1. Do not treat the current `ON DELETE SET NULL` behavior as an erasure mechanism. The next reviewed migration must choose and test an explicit actor-erasure strategy (for example, actor-scoped deletion before account removal or a tightly controlled database lifecycle hook). A simple foreign-key cascade must not be introduced without reviewing the account-deletion transaction and other legal retention obligations.
2. Keep actor-scoped SELECT and INSERT policies intact. The executive read model must be a separate, narrowly granted aggregate interface with server-side global-admin verification, bounded windows, minimum cohort suppression and audit evidence; it must never expose raw rows.
3. Evaluate typed columns or expression indexes for product/module/time aggregation against query plans and expected volume. Do not add indexes speculatively before measuring the aggregate query plan.
4. Add a service-only retention purge with explicit approved duration, bounded batches, idempotency and audit evidence. Do not grant ordinary authenticated users a table-wide DELETE capability.
5. Reconcile repository migration files against the live ledger before preparing any migration, then follow the exclusive Frame gate in issue #82. The production audit above was read-only; no migration or SQL mutation was executed.

**Release-blocking finding:** account deletion currently anonymizes the actor foreign key but leaves analytics event rows. Until a reviewed erasure path and retention purge are implemented and tested, the product must not claim that consent withdrawal or account deletion removes previously collected Product Analytics data.

## Application lifecycle implementation audit — 2026-11-23

A read-only review of the current Product Analytics branch traced the application-side consent and identity lifecycle:

- `ProfileService.getOrCreate` defaults `privacy.product_analytics` to `false`, including legacy profiles where the field is absent.
- `ProfileService.update` validates the consent value as a boolean, merges it with the persisted privacy object, and writes only the authenticated user's profile. The account settings UI calls `refreshProductAnalyticsConsent` after a successful privacy update.
- The browser telemetry helper caches consent only within the current JavaScript context; the API independently reads the persisted profile preference for every event. A stale tab/cache therefore cannot override a withdrawal at ingestion time.
- The API ingestion test suite covers the negative case: when the stored preference is false, the request is rejected and no event insert is attempted.
- The identity API currently exposes identity lookup and profile GET/PATCH routes. The inspected identity module/controller/service contain no account-erasure endpoint or auth-user deletion orchestration. This is an implementation gap, not merely a missing analytics-table policy.
- The analytics table has no actor-scoped DELETE policy in the production policy audit. Consequently, neither the current profile UI nor the current identity API can fulfill a user's analytics erasure request end-to-end.

**Implementation decision:** do not add an ad-hoc DELETE route to the profile controller or grant users direct table DELETE. Account erasure must be designed as an authenticated, auditable lifecycle operation that coordinates Supabase Auth deletion, actor-linked application records, analytics event deletion, and separately governed institutional/audit records. It must be idempotent, ordered safely before auth identity removal where actor attribution is still required, and covered by cross-user negative tests. This remains blocked on the approved data-retention policy and the Frame migration gate.


## Executive aggregate API contract — implementation staged, database pending

The API exposes `GET /v1/platform/analytics/product/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` on the analytics feature branch. It verifies the caller through `IdentityService.requireGlobalAdmin`, validates real UTC calendar dates, rejects reversed ranges, and caps each request at 90 inclusive calendar days. The service delegates to `zion_product_analytics_summary(p_from_date, p_to_date)`; it does not query event rows directly and does not return personal activity history.

**Important deployment dependency:** the aggregate RPC is not present in the audited production migration ledger. This API contract is staged only; it is not production-functional until the matching database function is implemented, tested and applied through Frame. Do not merge/deploy this endpoint as a complete analytics release while the RPC is absent.

The database function contract must independently:
- Revalidate `auth.jwt() -> app_metadata` for `zion_global_role = global_admin` and `zion_verified = true`; never rely only on the API check.
- Keep the existing actor-scoped table RLS policies unchanged. If a tightly scoped `SECURITY DEFINER` function is needed to aggregate across actors, pin its search path, restrict execute grants, avoid dynamic SQL, and return aggregate rows only.
- Accept only the bounded date interval passed by the API and use UTC date buckets.
- Return only aggregate product/module/event/date dimensions and metric counts/ratios. Never return actor IDs, session IDs, event IDs, raw JSON properties or individual histories.
- Apply a data-owner-approved minimum cohort threshold before exposing cohort/funnel results. The numeric threshold remains intentionally unset pending approval; small groups must be suppressed rather than guessed.
- Write an append-only aggregate-access audit record containing the verified administrator, date interval, metric/catalogue version and outcome, without copying event payloads.
- Be covered by SQL regression tests for unauthorized JWT claims, ordinary members, local/institutional roles, unverified global admins, out-of-range dates, small cohorts, and attempts to retrieve raw event data.

The current code tests the API authorization boundary, date parsing, range limit and RPC delegation. These tests do not prove the database function exists or that its SQL authorization, suppression, audit and query plan are correct.


## Live migration reconciliation — 2026-11-24 (read-only)

The connected production Supabase project was checked again through its migration ledger. Its latest applied migration remains **20261113095841** (`resa_call_alert_lifecycle_cleanup`). The repository's current `main` tree contains a later migration, `20261123170000_institutional_intelligence_aggregation.sql`, which is **not present in the live production ledger**. This establishes migration drift beyond Product Analytics: the repository migration queue and production database are not yet reconciled.

Consequences:
- Do not create or apply a Product Analytics migration in production as an isolated change.
- The Frame plan must first enumerate and reconcile every repository migration after `20261113095841`, including the existing Institutional Intelligence aggregation migration, against the live ledger and the exact target project.
- Do not mark Institutional Intelligence's SQL migration as deployed merely because it exists on `main` or its tests pass.
- Product Analytics remains blocked until the full pending queue has a reviewed Frame plan, disposable-Postgres regression coverage, protected-environment approval and post-execution ledger verification.
- The live project is currently reported as `ACTIVE_HEALTHY`; that status confirms project availability only, not migration parity or application deployment health.

No SQL, schema, data, RLS policy or migration ledger was changed during this check.
