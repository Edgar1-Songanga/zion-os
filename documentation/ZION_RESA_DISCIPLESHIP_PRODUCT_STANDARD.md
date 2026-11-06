# ZION + RESA + Discipulado — Product and Architecture Standard

**Status:** product/engineering baseline for implementation and presentation readiness  
**Reference review:** 2026-11-06  
**Scope:** Adventist institutional administration, open spiritual social network, discipleship and multilingual experience.

## 1. Product boundaries

ZION, RESA and Discipulado are connected product domains with distinct authorization and data boundaries.

- **ZION** is the institutional administration system. It serves the local church and the higher organizational levels configured by the Adventist structure: Mission/Conference, Union, Division and General Conference. The exact territorial naming and entity mapping must be configurable for the relevant territory.
- **RESA** is an open spiritual social network. Registration and ordinary social participation must not require church membership, a ZION account, or an institutional invitation.
- **Discipulado** is a continuous spiritual-growth and pastoral-care domain. It can be entered from ZION and RESA, but it is not merely a chatbot and does not replace pastors, elders, Bible teachers or local church relationships.

One person identity may participate in RESA and separately hold one or more authorized institutional memberships in ZION. Institutional profiles (church, mission, union, division, General Conference, department/ministry) are durable identities with delegated administrators; they are not personal accounts and must not disappear when a leader changes.

## 2. Official Adventist naming and taxonomy

Use the official Portuguese names published by the Seventh-day Adventist Church and the applicable territorial organization. Do not invent labels, abbreviations or generic substitutes. Keep the original official name, stable internal identifier, source URL, source authority and review date in the catalogue.

The South American Division's official portal lists the following departmental/service names (the exact local implementation and availability depend on the territory and organizational level):

- ASA / **Ação Solidária Adventista**
- **Associação Ministerial**
- **Aventureiros**
- **Comunicação**
- **Desbravadores**
- **Educação**
- **Escola Sabatina**
- **Espírito de Profecia**
- **Evangelismo**
- **Liberdade Religiosa**
- **MAP / Ministério Adventista das Possibilidades**
- **Ministério da Criança**
- **Ministério da Família**
- **Ministério da Mulher**
- **Ministério da Música**
- **Ministério de Surdos**
- **Ministério do Adolescente**
- **Ministério Jovem**
- **Ministério Pessoal**
- **Missão Global**
- **Mordomia Cristã**
- **Publicações**
- **Saúde**
- **Secretaria**
- **Serviço Voluntário Adventista**

Official portal navigation and department list: https://downloads.adventistas.org/pt/institucional/manuais-e-guias/manual-da-igreja-revisao-2025/ and https://institucional.adventistas.org/pt/quem-somos/identidade/manual-da-igreja/

The General Conference's elected global department leadership for 2025–2030 also uses names such as **Ministérios de Capelania Adventista**, **Ministérios da Criança**, **Comunicação**, **Educação**, **Ministérios da Família**, **Ministérios da Saúde**, **Associação Ministerial**, **Assuntos Públicos e Liberdade Religiosa**, **Doações Planejadas e Serviços de Confiança**, **Ministérios de Publicações**, **Escola Sabatina e Ministérios Pessoais**, **Ministérios de Mordomia**, **Ministérios da Mulher** and **Ministérios Jovens**. Use the name appropriate to the level and official source; do not force a global directorate label onto every local congregation.

Source: https://noticias.adventistas.org/pt/igreja-adventista-elege-lideres-departamentais-para-o-periodo-de-2025-a-2030/

### 2.1 Taxonomy must not flatten unlike entities

The catalogue must distinguish:
1. Departments / departmental ministries.
2. Auxiliary organizations and local organizations.
3. Clubs and age-specific programs (for example Aventureiros and Desbravadores).
4. Projects, campaigns and temporary initiatives.
5. Elected offices and roles (pastor, elder, secretary, treasurer, deacon, director, coordinator).

A project or office must not become a department merely because it appears on an official portal. A club/program must retain its own rules, age bands, leadership, safeguarding and reporting. The catalogue is a discoverable reference library, not an instruction to create every item in every local church.

### 2.2 Local configuration

- A local church chooses only the structures it actually operates and has authorized.
- Adding one catalogue entry creates only that one local association. It must be idempotent and auditable.
- Catalogue entries remain globally discoverable and are not automatically copied into organizations.
- Assigning a director/leader is a separate action from creating the department/ministry.
- Elections, appointments, terms and replacements must follow the Church Manual and applicable territorial policy. The software records the authorized decision; it does not make ecclesiastical appointments.
- A higher organization may maintain departmental directors and support/supervision relationships with lower organizations without receiving unrestricted executive control over the local church.

## 3. ZION institutional hierarchy and authorization

Model actual organizations and parent-child relationships in persistent data. Never render a hard-coded sample organization tree as if it were production structure.

Required organizational levels:
- Local church.
- Mission / Conference (territorial naming configurable).
- Union.
- Division.
- General Conference.

A user's login identity is central. After authentication, the user selects or is routed to an authorized organizational context and, where relevant, a department/unit. The selected context is not an authorization claim: the API must verify active membership, role, scope and parent-child jurisdiction on every protected operation.

A user may hold several memberships across organizations. Switching context must not require creating duplicate accounts. A local church administrator must not grant themselves Mission, Union, Division or General Conference privileges. Higher-level visibility must be derived from explicit jurisdiction and role grants.

The administrative experience must be role-based, not a fixed dashboard for all users. Examples of local roles include pastor, church secretary, treasurer, elder, deacon/deaconess and elected departmental directors. Higher levels have their own administrative, secretariat, treasury, departmental and personnel responsibilities as defined by applicable policy. Do not show a local-church HR/payroll module merely because those routes exist in the application.

## 4. RESA social network requirements

RESA is public to register and participate. A ZION membership is optional and only adds an institutional connection when independently verified and authorized.

### 4.1 Identity and profiles
- Personal profiles: public/private controls, bio, avatar, language, content preferences, follow graph and account safety.
- Institutional profiles: church, Mission/Conference, Union, Division, General Conference, department/ministry and authorized organizations.
- Delegated profile management with multiple authorized managers, role scopes, audit history and safe transfer when leaders change.
- A publication authored by an institutional profile must preserve the institutional author identity; do not impersonate the personal director.
- Verified institutional identity must be distinct from paid personal verification or a decorative badge.

### 4.2 Core social experience
- A chronological home feed with pagination, stable cursors and clear audience controls.
- Create, edit, delete/archive and report content; text, image, video, scripture references and accessible captions.
- Comments, threaded replies, reactions, saves, reposts/quote posts, mentions, hashtags/topics and share links.
- Stories with explicit expiry, archive and audience controls.
- Short-form vertical video with upload validation, transcoding, thumbnails, captions and moderation.
- Public/private communities, membership requests, moderators, community feeds and events.
- Direct and group messaging, attachments, read/delivery state, block/report and notification preferences.
- Live streaming with tested ingest, SFU/egress, audience authorization, chat moderation, reconnect, recording lifecycle, replay storage and deletion policy.
- Discovery for people, churches, institutional profiles, ministries, communities, events and topics.
- Creator tools: drafts, scheduled posts, media library, moderation queue and meaningful analytics.
- Accessibility, low-bandwidth/mobile-first operation and graceful media fallback.

### 4.3 Trust and safety
- Report, block, mute, restrict, rate limits, anti-spam and abuse review queues.
- Minor protection, age-appropriate experiences, safeguarding escalation and restricted discovery.
- Privacy-by-default for sensitive profile fields and private groups.
- Clear community standards, appeals, moderator audit trail and transparent enforcement.
- Do not expose private pastoral/counselling records through social search, recommendations or public profiles.

### 4.4 Persistence contract
A UI action is successful only after the server confirms persistence. On refresh, sign-out/sign-in, device change and network retry, the user must see the same authoritative state. Feed responses must include the viewer's own reaction/save state, not just aggregate reaction counts. Use idempotency for retryable writes and stable identifiers for uploads and media processing.

Do not call a feature production-ready until end-to-end tests cover persistence, RLS, API authorization, concurrency, failure/retry and mobile network conditions.

## 5. Discipulado and AI pastoral companion

Discipulado is a guided, continuous process that connects Bible learning, prayer, spiritual habits, human relationships and service. It is not an AI pastor replacement.

Capabilities:
- Structured Bible studies by topic, audience, spiritual journey and progress.
- Daily Bible reading, devotion, prayer journal and personal goals.
- Follow-up journeys for visitors, Bible interests, baptismal candidates, newly baptized members, returning members and ongoing members, with consent and authorized human oversight.
- Human pastoral/mentor assignment, appointments, visits, follow-up tasks and escalation.
- Small groups, Sabbath School classes, mentoring and ministry/service pathways.
- Progress timeline, reminders and next-step recommendations.
- AI study companion grounded in the Bible and approved Adventist sources, with citations/references and clear distinction between scripture, church material and generated explanation.
- AI must not decide church membership, discipline, baptism readiness, spiritual status or pastoral risk. Sensitive situations must be escalated to a human, with consent and least-privilege access.

### 5.1 Privacy and pastoral confidentiality
Pastoral notes, counselling, prayer requests and family-care cases are sensitive. Use explicit consent, scoped access, audit logs, retention/deletion rules and separation from ordinary RESA content. The AI must not train on or expose private pastoral notes without a separate, explicit and lawful basis. Do not promise absolute confidentiality where the platform cannot guarantee it.

## 6. Multilingual standard

The product should support the languages required by its actual user communities, including Angolan Portuguese, English, French, Spanish, Mandarin, Arabic, Kiswahili, Kimbundu and other relevant African languages.

- Keep interface locale, content language and translation language separate.
- Use reviewed human translations for critical navigation, legal/consent text, financial workflows, safeguarding and doctrinal content.
- AI translation is an assistive fallback, not a substitute for native-speaker review. Preserve the original text and identify machine translations.
- Do not label a locale as complete while it falls back to English or has missing strings.
- Support RTL layout for Arabic, locale-aware dates/numbers and language-specific search.
- Do not infer a user's language solely from country; allow explicit choice and remember it.
- Maintain translation coverage reports and regression checks in CI.

## 7. Angola and territory configuration

Support local realities without changing global Church governance:
- Configure territorial organization names, currency, dates, languages, reporting periods and administrative boundaries.
- Handle low bandwidth, intermittent power, mobile-first workflows, offline drafts and safe sync.
- Keep local church data entry simple; verification and approvals should be proportional to risk.
- Support territory-specific policy, privacy and retention settings, while preserving General Conference-level invariants.
- Do not hard-code South American Division-only terminology or programmes as universal for Angola. Validate local naming and implementation with the responsible Angola Union/Mission.

## 8. Presentation-readiness acceptance

A release candidate is presentable only when:
- The hierarchy is data-driven and authorization-tested at all five levels.
- Login/context switching never grants access from a user-selected label alone.
- Church administration workflows are backed by real records and audit trails.
- Department catalogue names and types have source provenance and local activation is explicit.
- RESA can be used by a person with no ZION membership.
- Personal and institutional profiles can publish, follow, interact and persist independently.
- Feed viewer state (reacted/saved) survives reload and new sessions.
- Stories, messaging, live and replay claims are verified end-to-end or clearly marked unavailable.
- Discipleship journeys persist and can be continued by the user and authorized human mentor.
- AI outputs cite sources where possible, state uncertainty and protect pastoral data.
- All advertised locales meet declared coverage thresholds and RTL has been tested.
- No fake dashboard metrics, demo records or placeholder actions are presented as real.
- Production migrations, backups, monitoring, incident response and rollback are documented.

## 9. Authoritative references

- Church Manual, 2025 revision (official DSA downloads): https://downloads.adventistas.org/pt/institucional/manuais-e-guias/manual-da-igreja-revisao-2025/
- General Conference Church Manual: https://gc.adventist.org/church-manual/
- Official Adventist organizational identity and Manual: https://institucional.adventistas.org/pt/quem-somos/identidade/manual-da-igreja/
- DSA official departments and services navigation: https://downloads.adventistas.org/pt/institucional/manuais-e-guias/manual-da-igreja-revisao-2025/
- Official 2025–2030 General Conference departmental leadership: https://noticias.adventistas.org/pt/igreja-adventista-elege-lideres-departamentais-para-o-periodo-de-2025-a-2030/
- Ação Solidária Adventista (ASA): https://www.adventistas.org/pt/asa/
- Escola Sabatina: https://www.adventistas.org/pt/escolasabatina/
- Ministério do Adolescente: https://www.adventistas.org/pt/adolescentes/sobre-nos/

This document is a product/engineering baseline, not an official Church policy or a declaration of denominational approval. Any governance rule must be validated against the current Church Manual and applicable territorial policy before being represented as compliant.
