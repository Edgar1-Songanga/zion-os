-- RESA Live Studio: persistent host-assigned co-host roles.
create table if not exists public.resa_live_cohosts (
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'cohost' check (role = 'cohost'),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (live_id, user_id)
);
create index if not exists resa_live_cohosts_user_idx on public.resa_live_cohosts(user_id, live_id);

alter table public.resa_live_cohosts enable row level security;
drop policy if exists resa_live_cohosts_read on public.resa_live_cohosts;
create policy resa_live_cohosts_read on public.resa_live_cohosts
for select to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.resa_live_sessions s
    where s.id = live_id and s.host_id = (select auth.uid())
  )
);
drop policy if exists resa_live_cohosts_host_insert on public.resa_live_cohosts;
create policy resa_live_cohosts_host_insert on public.resa_live_cohosts
for insert to authenticated with check (
  assigned_by = (select auth.uid())
  and exists (
    select 1 from public.resa_live_sessions s
    where s.id = live_id and s.host_id = (select auth.uid())
  )
  and user_id <> (select auth.uid())
);
drop policy if exists resa_live_cohosts_host_delete on public.resa_live_cohosts;
create policy resa_live_cohosts_host_delete on public.resa_live_cohosts
for delete to authenticated using (
  exists (
    select 1 from public.resa_live_sessions s
    where s.id = live_id and s.host_id = (select auth.uid())
  )
);
grant select, insert, delete on public.resa_live_cohosts to authenticated;
