-- ZION platform runtime: durable events, analytics, and jobs.
create extension if not exists pgcrypto;

create table if not exists public.zion_domain_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(trim(event_type)) between 2 and 120),
  aggregate_type text not null check (length(trim(aggregate_type)) between 2 and 80),
  aggregate_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists zion_domain_events_queue_idx on public.zion_domain_events(status, occurred_at asc);
create index if not exists zion_domain_events_aggregate_idx on public.zion_domain_events(aggregate_type, aggregate_id, occurred_at desc);

create table if not exists public.zion_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name ~ '^[a-z0-9][a-z0-9_.-]{1,119}$'),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists zion_analytics_events_name_time_idx on public.zion_analytics_events(event_name, occurred_at desc);
create index if not exists zion_analytics_events_actor_time_idx on public.zion_analytics_events(actor_user_id, occurred_at desc);
create index if not exists zion_analytics_events_entity_idx on public.zion_analytics_events(entity_type, entity_id, occurred_at desc);

create table if not exists public.zion_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type ~ '^[a-z0-9][a-z0-9_.-]{1,119}$'),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists zion_jobs_claim_idx on public.zion_jobs(status, available_at asc, created_at asc);
create index if not exists zion_jobs_creator_idx on public.zion_jobs(created_by, created_at desc);

alter table public.zion_domain_events enable row level security;
alter table public.zion_analytics_events enable row level security;
alter table public.zion_jobs enable row level security;

drop policy if exists zion_domain_events_insert on public.zion_domain_events;
create policy zion_domain_events_insert on public.zion_domain_events for insert to authenticated with check (actor_user_id = (select auth.uid()));
drop policy if exists zion_domain_events_read on public.zion_domain_events;
create policy zion_domain_events_read on public.zion_domain_events for select to authenticated using (actor_user_id = (select auth.uid()));

drop policy if exists zion_analytics_events_insert on public.zion_analytics_events;
create policy zion_analytics_events_insert on public.zion_analytics_events for insert to authenticated with check (actor_user_id = (select auth.uid()));
drop policy if exists zion_analytics_events_read on public.zion_analytics_events;
create policy zion_analytics_events_read on public.zion_analytics_events for select to authenticated using (actor_user_id = (select auth.uid()));

drop policy if exists zion_jobs_insert on public.zion_jobs;
create policy zion_jobs_insert on public.zion_jobs for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists zion_jobs_read on public.zion_jobs;
create policy zion_jobs_read on public.zion_jobs for select to authenticated using (created_by = (select auth.uid()));

create or replace function private.set_zion_job_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_zion_jobs_updated_at on public.zion_jobs;
create trigger trg_zion_jobs_updated_at before update on public.zion_jobs for each row execute function private.set_zion_job_updated_at();
