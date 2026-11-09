-- Persist raise-hand requests for RESA group meetings.
create table if not exists public.resa_group_meeting_hand_raises (
  meeting_id uuid not null references public.resa_group_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'WAITING'
    check (status in ('WAITING', 'ACKNOWLEDGED', 'DISMISSED', 'WITHDRAWN')),
  raised_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id),
  check (
    (status = 'WAITING' and resolved_at is null and resolved_by is null)
    or (status = 'WITHDRAWN' and resolved_at is not null and resolved_by is null)
    or (status in ('ACKNOWLEDGED', 'DISMISSED') and resolved_at is not null and resolved_by is not null)
  )
);

create index if not exists resa_group_meeting_hand_raise_queue_idx
  on public.resa_group_meeting_hand_raises (meeting_id, raised_at asc)
  where status = 'WAITING';

create unique index if not exists resa_group_meeting_hand_raise_active_user_idx
  on public.resa_group_meeting_hand_raises (meeting_id, user_id)
  where status = 'WAITING';

create or replace function private.resa_group_meeting_hand_raise_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private, pg_temp
as $function$
begin
  if TG_OP = 'INSERT' then
    if new.user_id <> auth.uid()
       or new.status <> 'WAITING'
       or not exists (
         select 1
         from public.resa_group_meetings m
         join public.resa_group_meeting_participants p
           on p.meeting_id = m.id
         where m.id = new.meeting_id
           and m.status = 'OPEN'
           and p.user_id = auth.uid()
           and p.status in ('ACCEPTED', 'PRESENT')
       ) then
      raise exception 'Only an accepted participant may raise a hand in an open meeting'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if row(new.meeting_id, new.user_id, new.raised_at, new.created_at)
     is distinct from row(old.meeting_id, old.user_id, old.raised_at, old.created_at) then
    raise exception 'Raise-hand identity and queue position are immutable'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'WAITING' then
      raise exception 'A resolved raise-hand request cannot be changed'
        using errcode = '42501';
    elsif auth.uid() = old.user_id and new.status = 'WITHDRAWN' then
      new.resolved_at := now();
      new.resolved_by := null;
    elsif private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid())
      and new.status in ('ACKNOWLEDGED', 'DISMISSED') then
      new.resolved_at := now();
      new.resolved_by := auth.uid();
    else
      raise exception 'Not authorized to resolve this raise-hand request'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.resa_group_meeting_hand_raise_guard() from public, anon, authenticated;

drop trigger if exists resa_group_meeting_hand_raise_guard
  on public.resa_group_meeting_hand_raises;
create trigger resa_group_meeting_hand_raise_guard
before insert or update on public.resa_group_meeting_hand_raises
for each row execute function private.resa_group_meeting_hand_raise_guard();

alter table public.resa_group_meeting_hand_raises enable row level security;

revoke all on table public.resa_group_meeting_hand_raises from public, anon;
grant select, insert, update on table public.resa_group_meeting_hand_raises to authenticated;

drop policy if exists resa_group_meeting_hand_raises_read
  on public.resa_group_meeting_hand_raises;
create policy resa_group_meeting_hand_raises_read
on public.resa_group_meeting_hand_raises
for select to authenticated
using (private.resa_is_group_meeting_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_hand_raises_insert
  on public.resa_group_meeting_hand_raises;
create policy resa_group_meeting_hand_raises_insert
on public.resa_group_meeting_hand_raises
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'WAITING'
  and exists (
    select 1
    from public.resa_group_meetings m
    join public.resa_group_meeting_participants p
      on p.meeting_id = m.id
    where m.id = meeting_id
      and m.status = 'OPEN'
      and p.user_id = (select auth.uid())
      and p.status in ('ACCEPTED', 'PRESENT')
  )
);

drop policy if exists resa_group_meeting_hand_raises_update
  on public.resa_group_meeting_hand_raises;
create policy resa_group_meeting_hand_raises_update
on public.resa_group_meeting_hand_raises
for update to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid()))
);
