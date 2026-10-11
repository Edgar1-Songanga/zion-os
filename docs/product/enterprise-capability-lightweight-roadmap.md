# ZION OS — Enterprise Capability & Lightweight Platform Roadmap

**Status:** active execution baseline  
**Product rule:** this roadmap describes ZION's own capabilities and quality gates. It does not use other products as branding, positioning, or in-product references.

## Product objective

Build one dependable, accessible, mobile-first operating platform for church administration, governance, finance, ministries, spiritual growth, and community life. The experience must feel coherent and premium while remaining fast on low-cost Android devices, unstable connections, and limited data plans.

The goal is not to maximize the number of modules. The goal is to make complete workflows easier, safer, faster, and more reliable than fragmented manual processes.

## Non-negotiable principles

1. **One identity, explicit authorization.** Every sensitive action is authenticated, permission-scoped, organization-scoped, and auditable. A user being signed in is not, by itself, authorization.
2. **No fake completion.** Distinguish implemented, tested, production-verified, and institutionally integrated capabilities.
3. **Mobile-first and data-light.** Request only required fields; paginate large collections; avoid overlapping polling; respect background tabs; compress and lazy-load media; keep core reading and administration usable on constrained networks.
4. **Privacy by default.** Minimize personal data, enforce row-level security, honor profile visibility, and never use user-editable profile metadata as an authorization source.
5. **Financial integrity.** Use balanced journal entries, atomic database operations, explicit approval states, immutable audit history, and idempotency for repeatable financial actions.
6. **Recoverable operations.** Provide correlation IDs, safe structured logs, clear error categories, retries only where safe, reconciliation paths, and operational health checks that exercise dependencies.
7. **Accessible and localizable.** Portuguese-first, clear language, readable typography, keyboard and screen-reader support, timezone-aware dates, and room for additional locales.
8. **No unsupported institutional claims.** Official membership, finance, identity, or directory synchronization is only considered available after a documented agreement, secure integration, and end-to-end verification.

## Capability domains and acceptance gates

| Domain | Existing repository foundation | Gate before claiming operational maturity |
|---|---|---|
| Identity and organization | Profiles, organizations, memberships, roles, permissions, hierarchical access | Cross-organization isolation tests; owner/admin/member permission matrix; recovery and audit checks |
| Membership administration | Identity and organization structures | Explicit member lifecycle, duplicate prevention, transfer history, privacy controls, exports, and verified data governance |
| Governance | Councils, meetings, participants, agendas, motions, quorum, voting, minutes and decisions | End-to-end meeting lifecycle, quorum edge cases, voting integrity, access isolation, immutable audit trail |
| Finance and payroll | Accounts, journal entries, payroll foundation, approval and statutory-rule structures | Atomic balanced posting, period controls, approval separation, reconciliation, idempotency and reproducible reports |
| Ministries and youth | Ministry directory, leaders, programs, reports, youth clubs, activities, attendance and progression | Complete create-to-close workflows, scoped access, historical integrity and operational reporting |
| Spiritual growth | Bible provider, numbered verse support, devotion, prayer, canonical content, growth tracking, Sabbath School | Source attribution, correct verse boundaries, current lesson data, accessibility, and fallback when a provider is unavailable |
| RESA community | Feed, discovery, profiles, graph, comments, reactions, saves, messaging, calls, communities, events, media, live and moderation | Visibility matrix, abuse controls, privacy-safe discovery, pagination, delivery state, rate limits, and mobile performance |
| Administration and operations | Admin surfaces, audit foundations, diagnostics and search | Actionable status pages, scoped administration, dependency-aware health, and traceable failures |
| Platform reliability | CI build/tests, serverless bootstrap smoke test, Vercel deployments, Supabase migrations | Production smoke tests, migration drift checks, alerts, rollback plan, backup/restore drills and incident playbooks |

## Execution sequence

### Track A — Reliability and access control

- Reproduce and classify the persistent Admin/RESA errors with a real authenticated request.
- Keep database failures distinguishable as authentication, authorization/RLS, schema drift, validation, conflict, and upstream failure.
- Build a permission matrix for member, ministry leader, organization administrator, finance approver, moderator, and platform operator.
- Add negative tests proving users cannot read or mutate another organization's restricted data.
- Add request correlation across web, API, and database diagnostics without logging tokens or private content.

**Exit gate:** critical Admin and RESA journeys pass using real authorized roles; forbidden actions fail safely; errors are diagnosable without exposing secrets.

### Track B — Lightweight experience

- Replace fixed rapid background refresh with visibility-aware refresh and single-flight request protection.
- Use cursor pagination for feeds, member lists, reports, and search results.
- Select only fields required by each screen; avoid unbounded relationship and interaction queries.
- Add request cancellation where supported, retry only safe/idempotent reads, and back off on repeated failures.
- Lazy-load media, use responsive images, respect reduced motion, and keep the first useful screen small.
- Measure API calls per active session, transferred bytes, first useful render, and error rate on mobile networks.

**Exit gate:** no overlapping feed requests; background tabs do not continuously poll; list endpoints have bounded results; mobile performance is measured rather than assumed.

### Track C — Complete administrative workflows

- Complete member and organization lifecycle workflows with history, approvals, audit, and safe exports.
- Complete governance from meeting creation through quorum, decisions, minutes, and follow-up actions.
- Complete finance from chart of accounts through balanced posting, approval, reconciliation, and reporting.
- Ensure payroll calculations are versioned and reviewable, with statutory parameters effective-dated and approvals separated from preparation.
- Make every workflow show its current state, next allowed action, responsible role, and audit history.

**Exit gate:** each workflow has automated happy-path, permission-denial, duplicate-submission, concurrency, and recovery tests.

### Track D — Integrated spiritual and community experience

- Keep Bible reading, lesson references, prayer, devotion, ministry participation, and youth activities connected through consistent identity and privacy rules.
- Show the current Sabbath School lesson with cover, source attribution, study references, and numbered Bible verses.
- Make RESA discovery and feed ranking explainable at a high level, privacy-respecting, and responsive to user feedback.
- Make messaging, notifications, live sessions, and media uploads expose clear delivery or failure states.
- Support reporting, moderation, appeals, and accountable decisions without exposing private reports to unauthorized users.

**Exit gate:** cross-module flows are tested from the user's perspective; private data remains private; failures have a recovery path.

### Track E — Institutional interoperability and scale

- Define data ownership, canonical identifiers, consent/legal basis, reconciliation rules, and conflict handling before connecting external institutional systems.
- Prefer documented APIs and explicit contracts; never scrape, duplicate, or silently overwrite authoritative records.
- Use asynchronous jobs for slow work, idempotency keys for repeatable commands, bounded retries, dead-letter/recovery queues, and reconciliation reports.
- Test realistic concurrency, database query plans, indexes, connection limits, storage lifecycle, and regional latency.
- Add backup restoration drills, incident runbooks, and capacity budgets before making scale claims.

**Exit gate:** interoperability is demonstrated end-to-end with approved credentials and test cases; scale claims are supported by measured load tests and recovery evidence.

## Release checklist

A release is not considered complete until all applicable checks are true:

- [ ] API build, web production build, unit tests and smoke tests pass.
- [ ] Migration names are unique and production migration state is reconciled.
- [ ] RLS and role-based authorization tests cover positive and negative cases.
- [ ] Sensitive operations are audited and safe to retry or protected from duplicate execution.
- [ ] Main user journeys are tested against the actual deployment, not only a health endpoint.
- [ ] Error logs contain operation, status, safe error code and correlation ID, but no credentials or private content.
- [ ] Responsive/mobile and accessibility checks pass.
- [ ] Rollback and recovery steps are documented for schema or behavior changes.
- [ ] The release notes distinguish verified production behavior from remaining limitations.

## Current next action

Finish the production verification of the recently merged Admin/RESA diagnostics and spiritual-reading work. In parallel, reduce RESA's background network load and establish measured performance and authorization baselines before broadening feature scope.
