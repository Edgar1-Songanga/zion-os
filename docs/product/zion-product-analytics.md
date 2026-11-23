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
