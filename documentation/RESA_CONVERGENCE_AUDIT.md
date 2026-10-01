# RESA — Convergence Audit

Date: 2026-10-01
Repository: Edgar1-Songanga/zion-os
Branch: main

## Executive result

The RESA concept and visual reference are broader than the current implementation. The repository already has the correct high-level domain folders, but several backend domains are currently documentation-only and the frontend is still largely prototype/mock-driven.

Therefore the correct strategy is **consolidation and elevation**, not replacement.

### Classification

- FOUNDATION PRESENT: Identity integration point, Profiles, Social Graph, Content model, Feed scoring core, Communities boundary, Discovery boundary, Live model, Media boundary, Messaging UI/domain boundary, Moderation boundary, Events UI, Notifications integration, spiritual interactions.
- PARTIAL / NEEDS REAL IMPLEMENTATION: Feed, Content persistence/API, Communities, Discovery/Search, Social Graph persistence, Profiles, Messaging, Live, Media, Moderation, Events, Notifications integration, Analytics.
- ABSENT AS FIRST-CLASS IMPLEMENTATION: Mentions, Hashtags/Topics, Tags, Polls, Bookmarks/Saves, Reposts/Shares, Quote posts, Stories engine, Creator Studio, unified Search service, Recommendation pipeline, Social Intelligence, moderation appeals/queues, domain-event contracts.
- VISUAL GAP: current RESA page is substantially simpler than the target visual concept and contains placeholder/mock behaviour.

## 1. Existing backend structure

apps/api/src/resa currently contains:
- communities
- content
- discovery
- domain
- feed
- live
- media
- messaging
- moderation
- profiles
- social-graph

The domain folders currently contain README placeholders rather than complete NestJS application services/repositories/controllers.

The active ResaModule currently provides only ResaEngine.

The current ResaEngine already has:
- content type model;
- visibility model;
- profile model;
- feed scoring signal model;
- live session lifecycle.

This is a useful domain foundation, but not yet a production RESA backend.

## 2. Existing frontend

Current RESA route:
apps/web/app/resa/page.tsx

Current surface includes:
- ResaHero
- CreatePost
- FeedCard
- ZionPoints
- CommunityCard

There are also components for:
- navigation;
- composer;
- feed;
- comments/replies;
- reactions;
- communities;
- events;
- invitations;
- live;
- meetings;
- messages;
- prayer.

### Current frontend limitation

CreatePost is currently presentation-only.

ResaFeedEngine currently renders a single FeedCard.

FeedCard currently contains local mock state for comments and hard-coded display data.

Therefore these surfaces must be connected to the real domain/API rather than rewritten as separate product concepts.

## 3. Existing data layer

Supabase currently has:
- resa_contents
- resa_follows
- resa_live_sessions
- notification tables

The existing content table supports:
- text;
- image;
- video;
- short_video;
- audio;
- live;
- story;
- article;
- bible_study;
- sermon;
- testimony;
- prayer.

It also has:
- visibility;
- language;
- organization;
- ministry;
- scripture references;
- timestamps;
- RLS.

### Important conclusion

story already exists as a content type, so we must extend the existing Content model into a Story capability, not create an unrelated Story system.

Likewise Live already exists and should be elevated rather than replaced.

## 4. Consolidation matrix

| Domain | Current state | Required action |
|---|---|---|
| Identity | Present through ZION modules | Integrate |
| Profiles | Domain boundary + frontend types | Complete real service/repository |
| Social Graph | Domain boundary + follows table | Complete graph/interactions |
| Content | Engine + resa_contents | Expand into complete content model |
| Feed | scoring core + UI | Build candidate/ranking/persistence pipeline |
| Comments | frontend components | Persist + API + moderation |
| Reactions | frontend + types | Persist + API + aggregation |
| Communities | boundary only | Implement |
| Discovery | boundary only | Implement |
| Events | frontend/types | Implement domain/API/persistence |
| Live | lifecycle + frontend + media | Integrate production path |
| Messaging | UI + boundary | Implement shared messaging service |
| Notifications | Supabase foundation | Connect RESA events |
| Moderation | boundary | Implement reports/actions/queues |
| Media | boundary | Connect central Media service |
| Mentions | Not first-class | Add |
| Hashtags/Topics | Not first-class | Add |
| Tags | Not first-class | Add |
| Polls | Not first-class | Add |
| Bookmarks/Saves | Not first-class | Add |
| Shares/Reposts | Not first-class | Add |
| Quote posts | Not first-class | Add |
| Stories | Content type exists | Complete existing model |
| Creator Studio | Not implemented | Add |
| Search | Discovery boundary only | Add real search layer |
| Recommendations | Feed scoring only | Evolve into recommendation pipeline |
| Social Intelligence | Not implemented | Add after graph/data foundations |
| Analytics | Not RESA-complete | Add product/creator/community analytics |
| Privacy | Partial via RLS | Complete controls/lifecycle |
| Accessibility | Not systematic | Add to composer/content/media |
| Audit | ZION audit exists | Integrate moderation/critical social actions |
| Domain events | Not formalized | Add contracts + idempotency |

## 5. Missing social primitives

These are now mandatory first-class concepts, not UI decorations.

### Mentions
@profile -> identity resolution -> permission -> notification -> moderation -> audit.

### Hashtags / Topics
#topic -> normalization -> topic entity -> indexing -> discovery -> trending -> moderation.

### Tags
Explicit tagging of people/entities/content, distinct from free-form hashtags.

### Polls
Poll entity -> options -> eligibility -> vote -> aggregation -> closing -> audit.

### Saves
User -> content -> saved item, with private-by-default semantics.

### Shares/Reposts
Original content -> distribution event -> new feed surface without duplicating canonical content.

### Quote Posts
New content referencing an existing content ID.

These should be implemented as extensions to the existing Content/Interaction architecture.

## 6. Target implementation order

### Block A — Social Foundation

Implement first:
1. content repository/service/controller;
2. comments/replies persistence;
3. reactions persistence;
4. social graph/follows;
5. mentions;
6. hashtags/topics;
7. tags;
8. saves/bookmarks;
9. shares/reposts;
10. quote posts;
11. visibility/audience rules.

### Block B — Feed & Discovery

Then:
1. candidate generation;
2. eligibility;
3. ranking;
4. diversity/freshness;
5. negative feedback;
6. Explore;
7. search;
8. topic discovery;
9. recommendation events.

### Block C — Communities

Then implement community entities, membership, roles, feed, channels, resources, events and moderation.

### Block D — Communication

Messaging + Stories + Notifications, reusing existing ZION services.

### Block E — Media & Events

Events + Live + replay + clips + central Media.

### Block F — Creator

Creator Studio, scheduling, analytics, audience and distribution.

### Block G — Intelligence

Recommendation Engine + Social Intelligence + AI Assistant.

### Block H — Safety/Enterprise

Moderation queues, appeals, verification, privacy, audit, retention and observability.

## 7. Non-negotiable consolidation rule

No new implementation may create a second version of:
- authentication;
- identity;
- organizations;
- notifications;
- media;
- meetings;
- payments;
- AI infrastructure.

RESA consumes ZION OS shared services.

## 8. Visual convergence

The current page is not yet at the quality of the reference concept.

The target UI should be built on top of the same domains, not as a visual-only mock.

The final experience must expose:
- Home;
- Explore;
- Communities;
- Live;
- Events;
- Messages;
- Notifications;
- Profile;
- Creator Studio;
- Library;
- Services/Marketplace integration.

All with:
- premium responsive design;
- dark/light support where appropriate;
- dynamic visual identity;
- accessibility;
- loading/empty/error states;
- real data;
- permissions-aware actions.

## 9. Immediate implementation target

The audit identifies **Block A — Social Foundation** as the next implementation block.

First implementation slice:
**Content + Interactions + Social Graph + Mentions + Hashtags/Topics + Saves + Shares/Reposts + Quotes**, with Supabase schema/RLS and NestJS services/controllers.

Do not implement Social Intelligence yet. It depends on reliable graph and interaction data.

Do not create a second Feed architecture. Extend the existing ResaEngine feed scoring into the later Feed/Recommendation pipeline.

Do not create a second Story architecture. Extend resa_contents.type = story.

## 10. Definition of done for Block A

Block A is not considered complete until:
- data is persisted;
- API exists;
- authorization/RLS exists;
- frontend consumes API;
- optimistic/error states are handled;
- moderation hooks exist;
- notifications fire where appropriate;
- audit exists for sensitive actions;
- indexes exist;
- tests cover core invariants;
- existing RESA UI remains functional;
- no duplicate ZION service is introduced.
