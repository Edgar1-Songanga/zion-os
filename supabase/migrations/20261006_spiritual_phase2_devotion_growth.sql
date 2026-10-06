create table if not exists public.spiritual_devotions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  scripture_references text[] not null check (cardinality(scripture_references) > 0),
  reflection text not null check (char_length(reflection) between 1 and 10000),
  prayer text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists spiritual_devotions_user_completed_idx
  on public.spiritual_devotions(user_id, completed_at desc);

alter table public.spiritual_devotions enable row level security;

drop policy if exists spiritual_devotions_owner_select on public.spiritual_devotions;
create policy spiritual_devotions_owner_select
  on public.spiritual_devotions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists spiritual_devotions_owner_insert on public.spiritual_devotions;
create policy spiritual_devotions_owner_insert
  on public.spiritual_devotions for insert to authenticated
  with check (user_id = auth.uid());

create table if not exists public.spiritual_growth_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null check (area in ('bible','prayer','devotion','service','community','leadership')),
  source text not null check (char_length(source) between 1 and 120),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists spiritual_growth_events_user_occurred_idx
  on public.spiritual_growth_events(user_id, occurred_at desc);

alter table public.spiritual_growth_events enable row level security;

drop policy if exists spiritual_growth_events_owner_select on public.spiritual_growth_events;
create policy spiritual_growth_events_owner_select
  on public.spiritual_growth_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists spiritual_growth_events_owner_insert on public.spiritual_growth_events;
create policy spiritual_growth_events_owner_insert
  on public.spiritual_growth_events for insert to authenticated
  with check (user_id = auth.uid());