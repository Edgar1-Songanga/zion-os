-- Disposable PostgreSQL fixture for the spiritual-growth trigger regression test.
-- Used only by GitHub Actions service container; never run against production.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end
$$;

create schema if not exists auth;
create table public.spiritual_growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  area text not null,
  source text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create table public.spiritual_devotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  completed_at timestamptz,
  title text
);
create table public.resa_prayer_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  status text not null default 'open',
  answered_at timestamptz
);
