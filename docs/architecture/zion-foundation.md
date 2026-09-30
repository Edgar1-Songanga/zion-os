# ZION OS — Foundation Architecture

## Purpose

The foundation establishes the physical repository structure and the identity, institutional, security and platform boundaries that every ZION domain must use.

## Physical layers

```
Experience      apps/web
Domain/API      apps/api
Shared          packages/*
Data/Auth       supabase/*
Documentation   docs/*
Automation      scripts/*
Cross-system    tests/*
CI/CD           .github/workflows/*
```

## Core domains

- Identity: users, profiles, verification and session context.
- Organizations: organizations, hierarchy, units and memberships.
- Governance: meetings, councils, committees, motions, voting, elections, quorum, minutes and decisions.
- Spiritual: Bible, prayer, devotion, ministry, growth and spiritual AI.
- RESA: profiles, social graph, content, feed, discovery, communities, media, live, messaging and moderation.
- Notifications, AI, Audit and Platform provide cross-domain capabilities.

## Architectural rule

ZION starts as a modular monolith in NestJS. Domains communicate through explicit application contracts and should not access another domain's persistence internals directly. A domain becomes an independent service only when scale, isolation or operational requirements justify it.

## Identity and data authority

Supabase Auth is the identity authority. Supabase/Postgres is the production persistence authority for ZION institutional data. The legacy Prisma schema in `apps/api/prisma` is transitional and must not introduce a second password, credential or organizational source of truth.

## Authorization

Authorization is based on organization membership, roles and permissions. RLS is enabled on exposed tables. User-editable profile metadata is never treated as an authorization source.

## Audit

Critical institutional actions must be auditable with actor, organization, action, resource and timestamp. Governance operations depend on this layer.

## Governance flow

Organization → Council/Committee → Meeting → Agenda → Motion → Vote → Result → Decision → Minutes → Audit.

## RESA

RESA is a first-class platform domain. Its profiles and social capabilities reuse ZION Identity, while institutional permissions remain controlled by Organizations and Governance.

## Media and Live

NestJS owns authorization, metadata, scheduling, moderation and analytics for Live. Video ingest, transcoding, CDN and playback are delegated to specialized media infrastructure.

## Foundation status

The repository now contains explicit physical boundaries for web features, API domains, shared packages, Supabase extensions, documentation, scripts and tests. The next engineering phase is to convert the skeleton into validated domain modules without creating competing persistence or identity systems.
