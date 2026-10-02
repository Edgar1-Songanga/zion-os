create extension if not exists pgcrypto;

create table if not exists public.resa_feed_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  feedback text not null check (feedback in ('not_interested','hide_author','report')),
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index if not exists resa_feed_feedback_user_idx on public.resa_feed_feedback(user_id, created_at desc);

create table if not exists public.resa_creator_schedules (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','published','cancelled','failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_id)
);
create index if not exists resa_creator_schedules_queue_idx on public.resa_creator_schedules(status, scheduled_for asc);
create index if not exists resa_creator_schedules_creator_idx on public.resa_creator_schedules(creator_id, scheduled_for desc);

alter table public.resa_feed_feedback enable row level security;
alter table public.resa_creator_schedules enable row level security;

drop policy if exists resa_feed_feedback_owner_all on public.resa_feed_feedback;
create policy resa_feed_feedback_owner_all on public.resa_feed_feedback for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists resa_creator_schedules_owner_all on public.resa_creator_schedules;
create policy resa_creator_schedules_owner_all on public.resa_creator_schedules for all to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

create or replace function private.set_resa_creator_schedule_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_resa_creator_schedules_updated_at on public.resa_creator_schedules;
create trigger trg_resa_creator_schedules_updated_at before update on public.resa_creator_schedules for each row execute function private.set_resa_creator_schedule_updated_at();
