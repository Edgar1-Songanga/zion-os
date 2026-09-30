# ZION OS — Foundation Architecture

## Purpose

The foundation establishes the identity, institutional, security and platform boundaries that every ZION domain must use.

## Core domains

- Identity: users, profiles, verification and session context.
- Organizations: organizations, hierarchy, organizational units and memberships.
- Governance: meetings, councils, committees, motions, voting and elections.
- Spiritual: Bible, prayer, devotion, ministry and spiritual AI.
- RESA: social graph, profiles, content, feed, discovery, media and live.
- Audit: immutable institutional traceability.
- Platform: events, jobs, notifications, search, analytics and shared infrastructure.

## Architectural rule

ZION starts as a modular monolith in NestJS. Domains communicate through explicit application contracts and should not access another domain's persistence internals directly. A domain becomes an independent service only when scale, isolation or operational requirements justify it.

## Identity authority

Supabase Auth is the identity authority. The application database stores ZION profile and institutional relationships; it must not create a second password/credential system.

## Institutional hierarchy

Organizations are hierarchical and tenant-aware. An organization may contain organizational units such as departments, councils and committees. Membership is scoped to an organization and can be associated with units.

The hierarchy is data-driven rather than hard-coded to one territory.

## Authorization

Authorization is based on organization membership, roles and permissions. RLS is enabled on exposed tables. User-editable profile metadata is never treated as an authorization source.

## Audit

Critical institutional actions must be auditable with actor, organization, action, resource and timestamp. Governance operations will rely on this layer.

## Future governance flow

Organization → Council/Committee → Meeting → Agenda → Motion → Vote → Result → Decision → Minutes → Audit.

## RESA relationship

RESA is a first-class platform domain. Its profiles and social capabilities reuse ZION Identity, while institutional permissions remain controlled by Organizations and Governance.

## Media and Live

NestJS owns authorization, metadata, scheduling, moderation and analytics for Live. Video ingest, transcoding, CDN and playback are delegated to specialized media infrastructure.

## Foundation status

The first Supabase schema establishes profiles, organizations, hierarchy, memberships, roles, permissions, unit memberships and audit logs with RLS and security policies. API module boundaries are present so subsequent engines can be implemented without collapsing domains together.
