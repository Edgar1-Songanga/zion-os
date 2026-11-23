# ZION Institutional Intelligence & Decision Support

**Status:** Product/architecture specification — proposed, not a production capability claim.  
**Scope:** Institutional reporting, analytics, forecasting and decision support for authorized church leadership.

## 1. Product direction

ZION Reports must evolve from static report exports into an Institutional Intelligence Centre: a governed decision-support capability that helps authorized leaders understand the current state of their organization, explain material changes, detect operational risks, compare periods and evaluate possible actions.

The product must feel modern and high-end, but visual sophistication must never imply analytical certainty that the underlying data does not support.

## 2. Core experience

The Reports area should provide a unified workspace with:

1. **Executive Overview** — organization-level indicators, period comparisons, material changes, open risks and actions requiring attention.
2. **Membership Intelligence** — membership movement, additions, transfers, removals, status changes, age/cohort distributions where lawful and available, and data-quality exceptions.
3. **Church & Department Performance** — activity completion, reporting timeliness, participation and departmental operational indicators, using formally approved definitions.
4. **Finance & Stewardship** — authorized financial summaries, budget versus actual, variance analysis, cash-flow trends and exception alerts. Access must be strictly segregated from general reporting.
5. **Pastoral & Spiritual Activity** — aggregate participation and program activity only where appropriate; never turn sensitive pastoral or personal information into leaderboards or individual risk scores.
6. **Youth & Community** — aggregate participation, program coverage and safeguarding-aware operational indicators.
7. **Governance & Compliance** — pending approvals, overdue reports, audit events, missing records and policy exceptions.
8. **Forecasts & Scenarios** — transparent projections based on sufficient historical data, with assumptions, ranges and confidence indicators.
9. **Decision Briefs** — concise, traceable summaries that explain what changed, why it matters, what evidence supports the finding and which actions may be considered.
10. **Report Builder & Exports** — role-scoped filters, saved views, scheduled delivery where authorized, and export to PDF/XLSX/CSV with source and generation metadata.

## 3. Decision-support workflow

Every insight follows the same evidence chain:

**Observe → Explain → Assess → Recommend → Assign → Review**

- Observe: show a measured value and its comparison baseline.
- Explain: identify the source records and the calculation.
- Assess: state impact, urgency and uncertainty.
- Recommend: offer options, not autonomous institutional decisions.
- Assign: allow an authorized leader to assign a follow-up action.
- Review: record the outcome and whether the action improved the indicator.

AI may summarize, classify, explain and draft options. It must not approve budgets, alter membership records, discipline people, make pastoral judgments or take irreversible actions.

## 4. Analytical capabilities

### Descriptive analytics
- Counts, rates, distributions, trends, period-over-period deltas and cohort views.
- Drill-down from Union to the authorized subordinate structure, subject to role and tenant scope.
- Clear denominators, reporting periods, filters and missing-data indicators.

### Diagnostic analytics
- Variance decomposition and contributing factors.
- Data-quality checks, late submissions, duplicates and inconsistent records.
- Explainable drivers with links to authorized source records.

### Predictive analytics
- Forecasts only when data volume, quality and history meet a documented minimum.
- Forecast intervals, back-testing results, model version, training window and assumptions.
- Explicit labels for low-confidence or insufficient-data situations.
- No unsupported forecasts for small churches or sparse cohorts; show “insufficient evidence” instead.

### Prescriptive decision support
- Options with expected benefits, costs, risks, constraints and evidence.
- Scenario comparisons (conservative / baseline / optimistic) where defensible.
- Human approval required for all institutional actions.

## 5. Futuristic user experience

The interface should use a premium command-centre design, responsive on mobile and desktop:

- Executive signal strip: key indicators, trend direction and status.
- Interactive time-series and comparison charts with accessible data tables.
- Organization hierarchy navigator with permission-aware drill-down.
- Insight cards with evidence, confidence and “why this matters”.
- Risk and exception queue with severity, owner and due date.
- Scenario studio for changing assumptions without changing source data.
- Decision brief view suitable for leadership meetings.
- Exportable board-ready reports with consistent branding and methodology notes.

Avoid decorative dashboards, excessive animation, unexplained scores and charts that cannot be traced to source data.

## 6. Data governance, security and privacy

- Supabase/PostgreSQL remains the source of truth; NestJS owns domain aggregation and authorization-aware orchestration; Next.js owns presentation.
- Enforce organization scope and role permissions server-side and in database policies. Hiding a chart in the UI is not authorization.
- Apply least privilege, financial segregation, audit logging and purpose limitation.
- Use aggregate reporting by default. Individual-level drill-down requires a legitimate purpose and explicit permission.
- Do not expose pastoral notes, counselling records, safeguarding details, health data or other sensitive personal information in general dashboards or AI prompts.
- Respect retention, correction, export and deletion rules established by the Church and applicable law.
- Every report records generation time, data-through timestamp, filters, organization scope, calculation version and requesting actor.
- AI providers, if any, must be reviewed for data processing, retention, residency, security and contractual terms before sensitive data is sent. Default to deterministic, in-platform analytics.

## 7. Metric registry

No KPI should be invented ad hoc. Establish a governed metric registry containing:
- stable metric identifier and approved name;
- business definition and formula;
- numerator, denominator and exclusions;
- source tables/events and freshness expectation;
- permitted organizational levels and roles;
- owner and approval status;
- known limitations and version history.

The Union must approve ecclesiastical definitions and reporting semantics before rollout.

## 8. Technical architecture

Recommended modular boundaries:

- reporting — report catalogue, filters, saved views and exports.
- analytics — deterministic aggregations, metric registry and time-series.
- insights — anomaly detection, evidence bundles and explainable narratives.
- forecasting — versioned models, evaluation, confidence intervals and scenario calculations.
- decision-log — recommendations, assignments, approvals and outcome tracking.

These are proposed boundaries, not a claim that these modules already exist. They should be introduced incrementally into the current modular monolith, reusing existing identity, organizations, finance, HR/payroll, spiritual, governance and audit domains.

Use read-optimized views/materialized aggregates where justified, with refresh status and lineage. Do not create a separate analytics database until measured workload or isolation needs justify it.

## 9. Quality and acceptance criteria

A capability is not complete until:
- every displayed metric has a documented formula, owner and source;
- role and organization isolation are tested with users from different churches and organizational levels;
- financial and sensitive domains pass negative authorization tests;
- aggregates reconcile to source records for defined test periods;
- empty, stale, incomplete and contradictory data are clearly represented;
- forecasts pass back-testing and display uncertainty, or are withheld;
- AI summaries cite the exact metric/evidence IDs used and never invent missing values;
- exports preserve filters, scope, generation timestamp and methodology;
- mobile, desktop, accessibility, performance and failure states are tested;
- audit events record access to restricted reports and sensitive exports.

## 10. Delivery sequence

**Phase A — Evidence foundation**
Metric registry, report inventory, authorization matrix, source lineage, reconciliation tests and data-quality indicators.

**Phase B — Executive Intelligence**
Executive overview, membership and department aggregates, comparison charts, exceptions and board-ready exports.

**Phase C — Diagnostic Insights**
Variance explanations, anomaly detection, evidence-linked insight cards and action tracking.

**Phase D — Forecasts & Scenarios**
Only after sufficient clean history exists; model evaluation, intervals, assumptions and scenario studio.

**Phase E — AI Decision Briefs**
Evidence-grounded natural-language summaries, options and meeting briefs with human review.

## 11. Institutional validation required

Before enabling Union-wide reporting, obtain formal agreement on:
- organizational hierarchy and data ownership;
- metric definitions and denominators;
- access matrix for Union, Mission/Association, local church and departments;
- financial and HR confidentiality;
- pastoral and safeguarding exclusions;
- reporting calendar, retention and audit requirements;
- pilot scope, success measures and governance owner.

## 12. Product promise

ZION should help leaders make better-informed decisions, not make decisions on their behalf. The system's credibility comes from traceable evidence, transparent methodology, privacy protection and disciplined uncertainty—not from futuristic graphics or unsupported AI claims.


## 13. Enterprise product and delivery standard

This product is not to be delivered as a sequence of disconnected micro-features, cosmetic increments or demo-only screens. Work is organized into complete, outcome-based vertical capability blocks. Each block includes, as applicable, domain model, APIs, persistence, authorization, auditability, responsive UI, interaction design, observability, automated tests, documentation and deployment readiness.

A block is accepted only when its end-to-end user journey works against real authorized data, failure states are handled, security boundaries are tested, accessibility and responsive behavior are checked, and the change is integrated into the mainline with passing CI. No placeholder data, fake AI insights, static mock dashboards or hidden unfinished flows may be represented as production functionality.

### Experience standard

- Premium, clean, precise, modern enterprise interface; information hierarchy before decoration.
- Fast, predictable interactions with progressive disclosure rather than crowded dashboards.
- Consistent design system, keyboard accessibility, screen-reader semantics and responsive behavior across mobile, tablet and desktop.
- Data visualizations must be legible, interactive where useful, exportable and accompanied by accessible tabular equivalents.
- Loading, empty, stale, partial, permission-denied, error and offline states are first-class UX states.
- Avoid gratuitous motion, noisy gradients, excessive cards, gamified institutional scores and visual effects that reduce trust.

### Complete capability blocks

1. **Institutional Data & Governance Foundation** — metric registry, source lineage, organization hierarchy, access matrix, audit, data quality and reconciliation.
2. **Executive Intelligence Workspace** — executive overview, role-aware navigation, period comparisons, drill-down, saved views and board-ready export.
3. **Operational Intelligence Suite** — membership, church, department, governance and authorized finance analytics, each with approved definitions and evidence.
4. **Insight & Action Management** — explainable variance/anomaly insights, evidence bundles, assignments, decisions and outcome tracking.
5. **Forecast & Scenario Studio** — validated forecasting, back-testing, confidence intervals, assumptions and scenario comparison.
6. **AI Decision Briefing** — evidence-grounded summaries and options, source references, human review and audit trail.

These are substantial product capability blocks, not promises that each already exists. They should be sequenced by dependency and delivered as complete vertical outcomes. Shared foundations must be built once and reused; avoid parallel one-off implementations.

### Release gate

Production-ready means more than a successful build: verified data correctness, role and tenant isolation, sensitive-data controls, automated regression coverage, performance budgets, operational monitoring, backup/recovery expectations, documented ownership and successful production smoke tests. Any unmet release gate must be explicitly disclosed; do not label the block production-ready until evidence exists.


## 14. Existing implementation audit (main branch snapshot reviewed 2026-11-23)

This section records concrete existing code so the implementation plan reuses current capabilities rather than creating a parallel dashboard.

### Existing user interfaces
- `apps/web/app/reports/page.tsx`: operational organization report. It selects an organization and reads `/v1/ministries/organization/:organizationId` and `/v1/youth/activities/organization/:organizationId/report`. It derives ministry/program/leader/report counts and youth operational totals from those responses, refreshes while the page is open, and supports browser print-to-PDF. It does not currently provide cross-period analytics, metric lineage, forecasting, evidence-linked diagnostic insights or a decision log.
- `apps/web/app/reports/layout.tsx`: route-level role gate currently allows `organization_owner` and `organization_admin`. Union and other institutional roles must be mapped explicitly and tested before this can become the Union executive workspace.
- `apps/web/app/analytics/page.tsx`: separate lightweight product-usage page calling `/v1/platform/analytics/summary`. Its own page text describes events and usage for the current account; it is not institutional analytics and must not be repurposed as a Union dashboard.
- `apps/web/components/organization/OrganizationSelector.tsx`: existing organization selector backed by `/v1/organizations`; reuse only after confirming server-side scope and authorized hierarchy semantics.

### Existing API and data foundations
- `apps/api/src/platform/platform.controller.ts` and `platform.service.ts`: platform event ingestion and product analytics endpoints exist. `analyticsSummary` filters `zion_analytics_events` by the authenticated actor's user ID and returns counts from a bounded recent event list. This is account-level product telemetry, not church membership, finance or department KPIs.
- `supabase/migrations/20261002_platform_runtime.sql`: `zion_analytics_events` is RLS-enabled with insert/select policies scoped to `actor_user_id = auth.uid()`. This is correct for personal event telemetry but cannot safely serve institutional reporting as-is.
- `apps/api/src/organizations/application/organizations.service.ts`: organization list, hierarchy, institutional listing and membership reads already exist. The hierarchy function is authorization-sensitive and must be reviewed for upward/downward visibility before leadership drill-down is exposed.
- Existing domain modules include Spiritual/Ministry, Youth, Finance, HR/Payroll, Governance, Audit and Identity. These remain the source domains; analytics must not duplicate their transactional records.
- `apps/api/src/finance/finance.service.ts` contains financial account and journal operations. Financial analytics must be exposed through finance-specific authorization and must not inherit generic report permissions.

### Confirmed gaps and architectural implications
1. Current Reports UI is an operational summary for a selected organization, not an institutional intelligence centre.
2. Current Analytics UI is actor-scoped product telemetry, not institutional analytics. Do not broaden its RLS policy or reuse it for church-level insights.
3. The current Reports route gate only names local organization owner/admin roles. A separate explicit institutional permission matrix is required for Union, Mission/Association, Conference and local church roles.
4. A new metric registry and analytics read model are required. Metric definitions must identify source domain, organization scope, reporting period, formula, numerator/denominator, freshness, data-quality state and access policy.
5. First release should aggregate only non-sensitive operational data already represented by stable domain records. Finance remains a separately authorized capability. Pastoral counselling, safeguarding and sensitive personal data are excluded from general intelligence and AI summaries.
6. Before implementation, inspect the exact policies and query contracts for ministry, youth, organization membership and finance tables; validate hierarchy semantics and cross-organization negative tests. Do not infer access from frontend selector contents.

### First complete engineering block — Executive Intelligence Foundation
The first implementation block is not a visual-only dashboard. It comprises:
- a governed metric registry and definitions;
- an organization-scoped reporting API with explicit institutional authorization;
- deterministic aggregate queries over existing source domains;
- data freshness, completeness and lineage metadata;
- a responsive Executive Intelligence workspace reusing the design system;
- comparison periods only where timestamped source data supports them;
- source-level reconciliation and cross-tenant authorization tests;
- accessible chart and table equivalents, plus export metadata;
- CI, operational logging and production release evidence.

No predictive model or AI-generated recommendation should be enabled until this evidence foundation is complete and the underlying historical data passes quality checks.
