# ZION OS + RESA — Platform Intelligence and Institutional Evidence Standard

**Status:** product and architecture acceptance baseline  
**Scope:** ZION OS, RESA, shared AI Core, institutional operations, member experience, analytics, evidence processing and automation.

## 1. Product direction

ZION OS is an integrated operating environment for the Seventh-day Adventist Church. It combines institutional administration, member services, spiritual growth, departmental operations, communication, reporting and decision support. RESA is the open community and social experience connected to ZION while retaining its own public participation model.

The platform must be designed as an original, extensible product. Its architecture, terminology, workflows and user experience are defined by ZION's own product standards.

The objective is not to add a chatbot to existing screens. Intelligence must be available contextually throughout the platform and must understand the modules, records, workflows, permissions, relationships and current state relevant to each authorized user.

## 2. Product capabilities

The platform must provide coherent, integrated capabilities for:

- Identity, households, membership records, transfers, offices, terms and organizational relationships.
- Local church and higher-level organizational administration.
- Secretariat, treasury, finance controls, receipts, budgets, reconciliations and audit trails.
- Department and ministry setup, plans, calendars, activities, leaders, objectives, evidence and reports.
- Councils, committees, agendas, minutes, resolutions, assignments and follow-up.
- Member-facing services, communication, learning, spiritual resources and voluntary discipleship.
- RESA profiles, public and restricted content, groups, messaging, media and community participation.
- Institutional knowledge, document management, multilingual experience, analytics and automation.

These capabilities must share canonical records and authorization rules. Users must not need to enter the same activity, person, financial event or report in multiple modules.

## 3. Shared intelligence architecture

A single governed AI Core provides shared platform understanding. Specialized capabilities are domain services, not independent agents with separate identities or conflicting memory.

### 3.1 Intelligence domains

1. **Platform Intelligence:** module catalogue, workflows, APIs, events, data relationships, help and contextual actions.
2. **Institutional Intelligence:** organizational structure, governance, departmental mandates, institutional reporting and operational needs.
3. **Knowledge Intelligence:** Bible, official beliefs, Church Manual, official statements, authorized denominational resources and Ellen G. White's published works.
4. **Evidence Intelligence:** image, document, PDF, video metadata and structured-record understanding; extraction, classification, deduplication and provenance.
5. **Reporting Intelligence:** validated metrics, report assembly, comparisons, trends, completeness and data-quality explanations.
6. **Member Intelligence:** member-authorized goals, learning, spiritual resources and requested pastoral support.
7. **Predictive and Operational Intelligence:** process delays, coverage gaps, overdue tasks, recurring needs and forecast scenarios where sufficient data exists.
8. **Multilingual Intelligence:** language detection, translation, localization and consistent terminology across the entire platform.
9. **Learning Intelligence:** quality evaluation and improvement from authorized feedback, aggregate product signals and reviewed corrections.

### 3.2 Grounding and source governance

Knowledge retrieval must use versioned, permission-scoped source collections. Each source record should retain title, source authority, issuing body, language, edition, publication date, retrieval date, rights/licence, status, stable passage identifiers and content hash where appropriate.

The system must distinguish:
- Biblical text from interpretation.
- Official doctrine or policy from commentary.
- Current documents from superseded editions.
- Verified facts from model-generated interpretation.
- Evidence-backed conclusions from hypotheses and recommendations.

Responses about governance or procedure must cite the applicable source and section when available. The AI must state uncertainty and abstain from inventing a rule, quotation, page or institutional authority.

### 3.3 Contextual operation

Each module should expose typed capabilities to the AI Core: permitted read operations, permitted draft/prepare operations, approval-required actions, event definitions and relevant help content. The AI must not gain permissions by virtue of being AI. Every operation is authorized server-side against the current user, organization, role, scope and resource.

## 4. Department and ministry intelligence registry

Maintain a canonical, versioned registry of departments, ministries, auxiliary organizations, clubs, projects, offices and roles. These are distinct entity types and must not be flattened into one generic category.

Each registry entry should include:
- Stable identifier and official display name by locale.
- Entity type and organizational levels where it may exist.
- Mandate, responsibilities and boundaries.
- Governing sources and effective version/date.
- Required or recommended plans, activities and report templates.
- Indicators, definitions, denominators and reporting cadence.
- Relationships with other departments and organizational levels.
- Responsible roles and approval requirements.
- Data classification and permitted audiences.

A local organization activates only the entities it actually operates and is authorized to maintain. Registry presence must never auto-create a local department, appoint an officer or imply that an activity occurred.

## 5. Institutional evidence lifecycle

### 5.1 Accepted evidence

Authorized users may submit photographs, scans, PDFs, office documents, attendance records, forms, event records, media links and structured descriptions through ZION or RESA.

### 5.2 Processing pipeline

1. Receive and quarantine the upload; verify file type, size, malware status and ownership.
2. Extract text and metadata using OCR/document parsing where appropriate.
3. Detect language and translate working metadata without overwriting the original.
4. Classify the likely organization, department, activity, date, location and reporting period.
5. Extract only fields supported by the evidence; mark uncertain values and missing fields.
6. Match possible duplicates or related evidence using stable activity identifiers and similarity signals.
7. Create a **provisional evidence record**, not an official report or verified statistic.
8. Route it to the responsible authorized reviewer.
9. Record corrections, validation decision, reviewer, timestamp and source provenance.
10. Publish validated fields to the appropriate reports and analytics projections.

### 5.3 Evidence integrity

An image alone cannot establish attendance counts, visitor status, membership status, consent, event ownership or outcomes unless the relevant information is independently recorded and validated.

AI-generated classifications and extracted values must retain confidence, source location/page/region where possible, model/version, processing time and review status. Corrections must be auditable. Original evidence must remain linked to derived records and must not be silently replaced.

### 5.4 Duplicate and cross-surface reconciliation

A single institutional activity may have evidence submitted through multiple surfaces. The platform must link records to one canonical activity where possible, detect likely duplicates, preserve each submission's provenance and prevent double-counting. Public RESA content is not automatically an official institutional record; the content owner or an authorized institutional reviewer must explicitly submit or approve it for institutional use.

## 6. Reporting and decision intelligence

Reports must be assembled from canonical records and validated evidence, not from unreviewed model assumptions.

Each metric must define:
- Numerator and denominator.
- Reporting period and organizational scope.
- Source tables/records and validation status.
- Last refresh time and data freshness.
- Missing-data and coverage limitations.
- Whether the value is confirmed, estimated or provisional.

Decision-support outputs must separate:
1. **Observed facts** — directly supported by authorized records.
2. **Interpretations** — explanations of patterns with cited evidence.
3. **Recommendations** — suggested actions, owners and deadlines.
4. **Unknowns** — missing or contradictory information requiring follow-up.

The system must distinguish no activity, activity not yet reported, report submitted but not validated, and unavailable data. Lack of a record is not proof that an activity did not occur.

Provide aggregated institutional views by authorized organizational scope. Individual follow-up details must be restricted to the responsible people with a legitimate role. Private conversations, prayer journals, personal diaries and private discipleship records must never be exposed through broad institutional reporting.

## 7. Proactive operations and automation

The existing automation foundation must be audited and extended rather than duplicated. Production automation requires durable persistence and an observable worker lifecycle.

Required properties:
- Event-driven and scheduled triggers.
- Durable queue/job state and transactional enqueue/outbox where applicable.
- Idempotency keys and deduplication.
- Bounded retries with backoff and explicit retryability rules.
- Dead-letter handling, replay and operator recovery.
- Lease/heartbeat or equivalent protection against abandoned work.
- Cancellation, pause, approval gates and per-tenant limits.
- Audit events, correlation IDs, metrics and actionable alerts.
- Per-action authorization and policy evaluation at execution time.

Proactive workflows may identify overdue reports, missing evidence, unassigned activities, expiring appointments, unresolved follow-ups, data-quality anomalies and emerging institutional needs. They may draft reports, prepare tasks and notify responsible users. They must not make sensitive pastoral, disciplinary, financial or governance decisions autonomously.

## 8. Identity, privacy and authorization

ZION institutional identity and RESA social identity are related but distinct. A person may participate in RESA without institutional membership. Institutional membership is scoped to an organization and role and may change over time.

Enforce least privilege and organization boundaries server-side. Apply row-level security, object-level authorization and storage policies consistently. Access to member-level records must be justified by role, purpose and scope. Sensitive fields require additional controls and audit.

Do not infer spiritual condition, loyalty, worth or risk from app usage or inactivity. Member support signals must be voluntary or otherwise explicitly authorized and must be presented as service opportunities, not hidden scores.

## 9. Multilingual platform standard

Language selection is explicit, persistent and takes precedence over location-based suggestions. Translation and localization cover navigation, forms, dynamic content, notifications, reports, help, RESA, AI interactions and supported documents.

Preserve original content and source language. Canonical scripture and official doctrinal/legal text must not be silently replaced by machine translation. Label machine translations where appropriate and support review workflows for high-impact content. Maintain terminology glossaries and language-specific quality evaluations.

## 10. Reliability, security and operational readiness

Production acceptance requires:
- CI gates for lint, type checks, unit tests, integration tests and build.
- Automated authorization and cross-tenant isolation tests.
- Migration validation against a disposable database before production.
- Backup, restore and disaster-recovery procedures.
- Storage upload validation, retention and access controls.
- Rate limits, abuse protection and resource quotas.
- Observability for API, queues, AI calls, translation and media processing.
- Performance tests using representative organization, member, report and media volumes.
- Mobile-first usability under constrained network conditions.
- Accessibility, localization and graceful degraded-mode behavior.

No feature is production-complete solely because it compiles or its deployment is marked ready. End-to-end behavior, persistence, authorization and operational recovery must be verified.

## 11. Delivery sequence and acceptance gates

### Stage 1 — Stabilize the foundation
Verify repository integrity, branch/review workflow, CI coverage, security baseline, dependency health, environment separation and deployment traceability. Record permission or provider limitations as explicit blockers.

### Stage 2 — Complete persistence
Verify durable persistence for identity, conversations, messaging, calls, meetings, attendance, evidence, report drafts, approvals, automation jobs and audit events. Confirm reconnect, retry and recovery behavior.

### Stage 3 — Automated end-to-end validation
Cover authentication, roles, organization isolation, RESA public participation, content privacy, messaging, calls, screen sharing, meetings, evidence submission, report validation and AI authorization.

### Stage 4 — Canonical ZION–RESA integration
Establish stable identities and APIs for eligible content and institutional evidence. Preserve distinct privacy boundaries and require explicit authorization for institutional publication or reporting.

### Stage 5 — Final production audit
Review RLS, storage, secrets, dependency risk, performance, observability, notifications, backup/restore, load capacity and real-device behavior.

### Intelligence acceptance
The intelligence capabilities are delivered in complete vertical slices after the foundation gates. Each slice must demonstrate source-grounded answers, scoped authorization, durable records, human validation where required, auditability and measurable end-to-end tests.

## 12. Definition of done

A capability is complete only when:
- Its product behavior and authorization contract are documented.
- Data is persisted and recoverable.
- UI, API, database and automation paths agree.
- Positive, negative, boundary and cross-organization tests pass.
- Relevant accessibility and localization checks pass.
- Observability and operator recovery are available.
- Migration and rollout are validated.
- Production behavior is verified without exposing test fixtures as real institutional data.
