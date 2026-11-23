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
- `bible_quiz_level_completed`: mode, level, correct count, question count and pass/fail.
- `devotion_saved`: reference count and whether a prayer field was included; never devotion or prayer text.
- `reel_reaction`: like/unlike action; never content or author ID.
- `live_created`: visibility class only; never title, password or description.

The API validates product/module/event combinations and accepts only event-specific properties. Unknown keys, free text and invalid values are rejected. The browser helper sends events asynchronously and does not block product interactions.

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
| Bible Quiz completion | Completed levels / started levels | Awaiting sufficient telemetry |
| Devotion completion | Saved devotion entries / devotion page visits | Awaiting sufficient telemetry |
| RESA Reels engagement | Valid reactions / eligible reel impressions | Awaiting impression event contract |
| Live conversion | Joined live sessions / created or scheduled sessions | Awaiting join event coverage |

No metric may be labelled live until its formula, denominator, event coverage, source freshness and access policy are verified.

## Security and privacy

- Current ingestion is authenticated. It attributes events to the verified Supabase actor on the server; the client cannot choose an actor ID.
- Do not collect search text, Bible passage text, prayer/devotion content, message content, email, phone, passwords, meeting titles, content IDs or precise location in Product Analytics.
- Product-level aggregate access must be restricted to verified global administrators. Existing actor-scoped RLS must not be broadened.
- Global aggregate queries require a reviewed database function/read model with explicit `app_metadata` authorization, bounded date windows, suppression for small groups where appropriate, and audit logging.
- Consent, retention, deletion and user-facing privacy notice must be aligned with the ZION privacy policy before broad passive telemetry is enabled.
- Operational logs and analytics events are separate datasets with separate retention and access policies.

## Delivery gates

1. Event registry, safe ingestion validation and first-party instrumentation.
2. Migration and secure aggregate RPC through the existing Frame gate; no direct production SQL or RLS bypass.
3. Product Analytics API with verified global-admin authorization, date filters, time-series, product/module breakdowns, funnels and retention.
4. Premium executive workspace with accessible charts, comparison windows, definitions, data freshness, empty/stale/error states and drill-down only to permitted aggregates.
5. Reconciliation, privacy, cross-role negative tests, performance and production smoke validation.

**Current known limitation:** the production analytics table returned no event rows during the initial read-only audit on 2026-11-23. Historical retention and trend metrics therefore cannot be calculated yet.
