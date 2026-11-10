-- Durable request-to-speak queue for RESA Live.
create table if not exists public.resa_live_hand_raises (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'WAITING'
    check (status in ('WAITING', 'APPROVED', 'DECLINED', 'WITHDRAWN')),
  raised_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  constraint resa_live_hand_raises_resolution_consistency check (
    (status in ('APPROVED', 'DECLINED') and resolved_at is not null and resolved_by is not null)
    or (status in ('WAITING', 'WITHDRAWN') and resolved_at is null and resolved_by is null)
  )
);

create unique index if not exists resa_live_hand_raises_one_waiting_per_user
  on public.resa_live_hand_raises (live_id, user_id)
  where status = 'WAITING';

create index if not exists resa_live_hand_raises_live_status_raised_idx
  on public.resa_live_hand_raises (live_id, status, raised_at asc);
create index if not exists resa_live_hand_raises_user_id_idx
  on public.resa_live_hand_raises (user_id);
create index if not exists resa_live_hand_raises_resolved_by_idx
  on public.resa_live_hand_raises (resolved_by)
  where resolved_by is not null;

alter table public.resa_live_hand_raises enable row level security;

drop policy if exists resa_live_hand_raises_select_visible on public.resa_live_hand_raises;
create policy resa_live_hand_raises_select_visible
  on public.resa_live_hand_raises for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      exists (
        select 1 from public.resa_live_sessions live
        where live.id = live_id
          and live.status = 'live'
          and (
            live.host_id = (select auth.uid())
            or exists (
              select 1 from public.resa_live_moderators moderator
              where moderator.live_id = live.id
                and moderator.moderator_user_id = (select auth.uid())
            )
          )
      )
      and private.resa_has_live_access(live_id)
    )
  );

drop policy if exists resa_live_hand_raises_insert_own on public.resa_live_hand_raises;
create policy resa_live_hand_raises_insert_own
  on public.resa_live_hand_raises for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'WAITING'
    and resolved_at is null
    and resolved_by is null
    and private.resa_has_live_access(live_id)
    and exists (
      select 1 from public.resa_live_sessions live
      where live.id = live_id
        and live.status = 'live'
        and live.host_id <> (select auth.uid())
    )
  );

drop policy if exists resa_live_hand_raises_withdraw_own on public.resa_live_hand_raises;
create policy resa_live_hand_raises_withdraw_own
  on public.resa_live_hand_raises for update to authenticated
  using (user_id = (select auth.uid()) and status = 'WAITING')
  with check (
    user_id = (select auth.uid())
    and status = 'WITHDRAWN'
    and resolved_at is null
    and resolved_by is null
  );

drop policy if exists resa_live_hand_raises_resolve_moderator on public.resa_live_hand_raises;
create policy resa_live_hand_raises_resolve_moderator
  on public.resa_live_hand_raises for update to authenticated
  using (
    status = 'WAITING'
    and exists (
      select 1 from public.resa_live_sessions live
      where live.id = live_id
        and live.status = 'live'
        and (
          live.host_id = (select auth.uid())
          or exists (
            select 1 from public.resa_live_moderators moderator
            where moderator.live_id = live.id
              and moderator.moderator_user_id = (select auth.uid())
          )
        )
    )
  )
  with check (
    status in ('APPROVED', 'DECLINED')
    and resolved_at is not null
    and resolved_by = (select auth.uid())
    and exists (
      select 1 from public.resa_live_sessions live
      where live.id = live_id
        and live.status = 'live'
        and (
          live.host_id = (select auth.uid())
          or exists (
            select 1 from public.resa_live_moderators moderator
            where moderator.live_id = live.id
              and moderator.moderator_user_id = (select auth.uid())
          )
        )
    )
  );

grant select, insert, update on public.resa_live_hand_raises to authenticated;
