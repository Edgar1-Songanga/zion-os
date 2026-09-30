# ZION OS

ZION OS is a production-grade digital platform combining spiritual experience, institutional operations and RESA social capabilities.

## Repository

- `apps/web` — Next.js experience layer / PWA foundation
- `apps/api` — NestJS domain and application API
- `packages/*` — shared contracts and utilities
- `supabase/*` — database migrations, functions and seeds
- `docs/*` — architecture, product, security, API and governance documentation
- `scripts/*` — operational tooling
- `tests/*` — cross-system tests

## Core architectural rule

Supabase Auth is the identity authority and Supabase/Postgres is the production persistence authority. NestJS owns domain/application orchestration. Next.js owns the experience layer.

ZION is intentionally structured as a modular monolith first. Infrastructure is allowed to evolve into independently scaled services when actual workload or isolation requirements justify it.

## Major domains

Identity · Organizations · Governance · Spiritual · RESA · Notifications · AI · Audit · Platform

See [docs/architecture/repository-architecture.md](docs/architecture/repository-architecture.md) and [docs/architecture/zion-foundation.md](docs/architecture/zion-foundation.md).
