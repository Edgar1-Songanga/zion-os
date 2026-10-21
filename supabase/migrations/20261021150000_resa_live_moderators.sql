create table if not exists public.resa_live_moderators (
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  moderator_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (live_id, moderator_user_id),
  check (moderator_user_id <> granted_by)
);

create index if not exists idx_resa_live_moderators_user
  on public.resa_live_moderators (moderator_user_id, live_id);

alter table public.resa_live_moderators enable row level security;

drop policy if exists resa_live_moderators_read on public.resa_live_moderators;
create policy resa_live_moderators_read
  on public.resa_live_moderators
  for select
  to authenticated
  using (
    moderator_user_id = (select auth.uid())
    or exists (
      select 1 from public.resa_live_sessions live
      where live.id = resa_live_moderators.live_id
        and live.host_id = (select auth.uid())
    )
  );

drop policy if exists resa_live_moderators_host_insert on public.resa_live_moderators;
create policy resa_live_moderators_host_insert
  on public.resa_live_moderators
  for insert
  to authenticated
  with check (
    granted_by = (select auth.uid())
    and exists (
      select 1 from public.resa_live_sessions live
      where live.id = resa_live_moderators.live_id
        and live.host_id = (select auth.uid())
    )
  );

drop policy if exists resa_live_moderators_host_delete on public.resa_live_moderators;
create policy resa_live_moderators_host_delete
  on public.resa_live_moderators
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.resa_live_sessions live
      where live.id = resa_live_moderators.live_id
        and live.host_id = (select auth.uid())
    )
  );
