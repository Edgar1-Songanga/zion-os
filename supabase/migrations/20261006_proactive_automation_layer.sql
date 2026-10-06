create extension if not exists pgcrypto;

alter table public.zion_jobs
  add column if not exists idempotency_key text;

create unique index if not exists zion_jobs_idempotency_key_uq
  on public.zion_jobs(idempotency_key)
  where idempotency_key is not null;

create table if not exists public.zion_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  event_type text not null check (length(trim(event_type)) between 2 and 120),
  action_type text not null check (action_type in (
    'notification.dispatch',
    'spiritual.reminder',
    'translation.prefetch',
    'analytics.record',
    'workflow.continue'
  )),
  enabled boolean not null default true,
  priority integer not null default 100,
  conditions jsonb not null default '{}'::jsonb,
  action_payload jsonb not null default '{}'::jsonb,
  approval_required boolean not null default false,
  cooldown_seconds integer not null default 0 check (cooldown_seconds between 0 and 2592000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zion_automation_rules_event_idx
  on public.zion_automation_rules(event_type, enabled, priority);
create index if not exists zion_automation_rules_created_by_idx
  on public.zion_automation_rules(created_by);

alter table public.zion_automation_rules enable row level security;

drop policy if exists zion_automation_rules_read on public.zion_automation_rules;
create policy zion_automation_rules_read on public.zion_automation_rules
for select to authenticated using (created_by = (select auth.uid()) or created_by is null);

drop policy if exists zion_automation_rules_insert on public.zion_automation_rules;
create policy zion_automation_rules_insert on public.zion_automation_rules
for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists zion_automation_rules_update on public.zion_automation_rules;
create policy zion_automation_rules_update on public.zion_automation_rules
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

insert into public.zion_automation_rules
  (name, event_type, action_type, priority, action_payload)
values
  ('spiritual-growth-analytics', 'spiritual.growth.completed', 'analytics.record', 10, '{"source":"automation"}'::jsonb),
  ('content-translation-prefetch', 'content.published', 'translation.prefetch', 20, '{"priority":"normal"}'::jsonb)
on conflict (name) do nothing;

create or replace function private.set_zion_automation_rule_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_zion_automation_rules_updated_at on public.zion_automation_rules;
create trigger trg_zion_automation_rules_updated_at
before update on public.zion_automation_rules
for each row execute function private.set_zion_automation_rule_updated_at();
