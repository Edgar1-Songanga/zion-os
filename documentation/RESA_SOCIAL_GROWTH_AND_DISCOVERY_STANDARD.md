# RESA — Social Growth, Discovery and Engagement Standard

**Status:** implementation standard; incremental delivery required.
**Scope:** public spiritual social network, personal and institutional profiles, short video, feeds, discovery and department publishing.

## 1. Product objective

RESA is the social network within the ZION platform for spiritual connection, learning, service and community participation. Growth must come from useful content and genuine relationships, not fabricated users, purchased engagement, dark patterns or compulsive engagement loops.

Success is measured by meaningful participation:
- people finding relevant people, churches, ministries and activities;
- healthy follow relationships and return visits;
- meaningful comments, saves, shares, registrations and attendance;
- repeat participation in Bible study, prayer, learning and service;
- content quality, safety and user trust.

Time-on-screen and raw view counts are not sufficient success metrics.

## 2. Two complementary feeds

### For You
Personalized discovery across eligible public content:
- relationship relevance (followed people and institutional profiles);
- freshness;
- declared interests and language;
- topic and ministry relevance;
- meaningful interactions (comments, saves, shares and completed viewing where consented);
- content quality and safety;
- creator diversity and exposure fairness.

Popularity is one weak signal, never the only signal. New creators and small congregations must have a fair opportunity to be discovered. Apply per-author and per-topic diversity limits so one creator or ministry cannot dominate every page.

### Following
Chronological feed containing public content from profiles the member explicitly follows, plus their own public posts. It must not silently inject unrelated recommended content.

Both feeds must respect privacy, blocks, moderation, institutional visibility and user feedback. The UI must make the active feed mode clear.

## 3. Social graph and relationships

The social graph supports:
- follow/unfollow;
- followers and following lists;
- profile suggestions;
- mutual-follow context;
- institutional profile follows;
- follow notifications with user preferences;
- block, mute and report;
- privacy controls for profile and content.

Follow mutations must be idempotent. Repeated taps or network retries must not create duplicate relationships or misleading errors. Counts must be authoritative and must not be calculated from a truncated display list.

Suggestions may use mutual connections, shared public interests, language, public ministry affiliations and community participation. Never infer sensitive attributes or expose private membership, pastoral, attendance or counselling data.

Do not generate fake followers, seed artificial conversations, or automatically follow accounts on behalf of members.

## 4. Profiles and verification

Personal and institutional profiles are distinct identities:
- personal profiles belong to an individual;
- church/ministry/department profiles belong to an institution and are managed by explicitly delegated administrators;
- institutional posts preserve the institution as author, even when a director changes.

Verification must communicate a real, reviewable trust claim. Institutional verification is based on authority and identity evidence. Personal verification is a separate policy. A paid subscription must never automatically imply that a person or institution is authentic. Badge state, reason, reviewer, evidence reference, decision timestamp and revocation history must be auditable. Never grant verification through a UI-only flag.

## 5. Content and engagement

Support text, image, short video, stories, Bible studies, sermons, testimonies, prayers, polls, questions, events and live replays.

Engagement actions:
- reactions;
- threaded comments and replies;
- reposts and quote posts;
- saves;
- shares with permanent deep links;
- mentions and topics;
- follow creator/ministry;
- report, mute and hide.

All actions must persist server-side and survive reload, sign-in and device changes. Use idempotency for retryable writes. The UI must show pending, success and failure states honestly.

Do not reward outrage, harassment, spiritual shaming, misinformation or sensationalized doctrine. Provide transparent reporting, moderation, appeal and block controls.

## 6. Short-video / Reels experience

Reels is a discovery surface, not the canonical owner of ministry activity data.

Required capabilities:
- vertical video player with swipe navigation;
- upload validation, thumbnails, adaptive transcoding and low-bandwidth variants;
- captions/subtitles, accessible labels and muted autoplay by default;
- creator and institutional attribution;
- follow, react, comment, save and share;
- links to the source department, class, event, course or live replay;
- content visibility and moderation checks before public distribution;
- watch progress/completion signals only with appropriate privacy controls.

A Reel linked to a department activity must open the canonical activity page. Deleting or unpublishing the Reel must not delete the administrative activity.

## 7. Institutional and department publishing

Each ministry/department works in its own authorized workspace. It does not need to operate inside the central ZION administration area.

The department workspace (inside its authorized ZION department area) provides:
- institutional profile and delegated managers;
- content and media library;
- events, classes, programmes and training;
- publication preview;
- explicit audience selector;
- publish/unpublish controls;
- performance analytics appropriate to the role.

When a department selects public distribution and passes required authorization, the canonical record becomes eligible for RESA public surfaces: Feed, Reels, Explore, search and its institutional page. The record remains owned by its source domain (for example Sabbath School or Youth Ministry). RESA stores/distributes a reference and presentation metadata rather than creating a second administrative copy. ZION remains the system of record for administration and department operations.

The publication pipeline must support draft, pending review, scheduled, published, suspended and archived states. It must record the authoring identity, approving identity, audience, timestamps and audit trail.

Private rosters, attendance, member contact details, pastoral records, financial details and safeguarding information must never be exposed through the public content pipeline.

## 8. Discovery and search

Explore must discover:
- people and creators;
- churches and institutional profiles;
- departments and ministries;
- Reels and other public posts;
- classes and public study groups;
- courses and training;
- events and live streams;
- topics and scripture references.

Search must be multilingual, permission-aware and filterable by content type, department, location where public, language and date. Search results must not leak the existence or metadata of private records.

## 9. Healthy engagement and notifications

Notifications should help members respond to meaningful relationships and activities:
- new follower;
- comment/reply or mention;
- event registration and reminders;
- live session starting;
- new public content from followed profiles, with frequency controls.

Provide digest controls, mute options, quiet hours and rate limits. Do not manufacture urgency, use misleading unread counts or send repetitive notifications to inflate activity.

## 10. Analytics and success measures

Personal creators and institutional managers receive only analytics authorized for their scope.

Useful measures:
- reach and unique viewers;
- meaningful video completion;
- follows attributable to a publication;
- saves, shares and substantive comments;
- event detail visits and registrations;
- class/course interest and attendance only in authorized administrative reporting;
- returning participants and community health.

Never expose identifiable viewer histories to institutional managers unless a separate lawful, disclosed and consented workflow permits it. Financial and pastoral analytics remain in their protected domains.

## 11. Technical and operational requirements

- ZION remains the central platform and administrative authority; RESA is its social network. ZION Identity remains the single identity and authorization source.
- Organization and department authority is checked server-side on every write.
- Supabase RLS and API authorization must enforce the same audience rules.
- Media is stored through the central Media service; use signed access for restricted assets.
- Feed candidate generation, eligibility and ranking remain separate stages.
- Use stable cursor pagination; avoid unbounded scans and N+1 profile lookups.
- Cache only public, non-sensitive data and invalidate on unpublish, block or moderation action.
- Use background workers for video processing, notifications and ranking aggregation when load justifies them.
- Instrument feed latency, video startup, errors, moderation backlog and notification delivery.
- Support low-bandwidth Android devices and graceful failure on intermittent networks.

## 12. Delivery sequence

1. Establish correct For You and Following feed contracts and test ranking/chronology.
2. Harden follow graph, authoritative counts, suggestions, privacy, block/mute and notifications.
3. Complete personal and institutional profile trust/verification flows.
4. Connect department workspaces to the canonical public publishing pipeline.
5. Build Reels playback, media processing, captions and canonical deep links.
6. Expand Explore/search and healthy engagement analytics.
7. Validate end-to-end on real accounts, including authorization, RLS, retries, moderation, mobile networks and production monitoring.

A capability is not production-ready until its persistence, authorization, failure/retry and mobile behavior are tested end-to-end. Never use demo users, fabricated engagement or placeholder metrics to make the network appear active.
