-- RESA group meetings are a first-class media aggregate, separate from messaging conversations and direct calls.
create table if not exists public.resa_group_meetings (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(trim(title)) between 2 and 160),
  description text,
  visibility text not null default 'INVITE_ONLY' check (visibility in ('INVITE_ONLY', 'PUBLIC')),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'OPEN', 'ENDED', 'CANCELLED')),
  scheduled_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  max_participants integer not null default 100 check (max_participants between 2 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is not null),
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists resa_group_meetings_host_schedule_idx
  on public.resa_group_meetings (host_user_id, scheduled_at desc);
create index if not exists resa_group_meetings_public_schedule_idx
  on public.resa_group_meetings (scheduled_at asc)
  where visibility = 'PUBLIC' and status in ('SCHEDULED', 'OPEN');

create table if not exists public.resa_group_meeting_participants (
  meeting_id uuid not null references public.resa_group_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_role text not null default 'PARTICIPANT'
    check (participant_role in ('HOST', 'MODERATOR', 'PRESENTER', 'PARTICIPANT', 'VIEWER')),
  status text not null default 'INVITED'
    check (status in ('INVITED', 'ACCEPTED', 'PRESENT', 'LEFT', 'DECLINED', 'REMOVED')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id),
  check (left_at is null or joined_at is not null)
);

create index if not exists resa_group_meeting_participants_user_idx
  on public.resa_group_meeting_participants (user_id, created_at desc);
create index if not exists resa_group_meeting_participants_status_idx
  on public.resa_group_meeting_participants (meeting_id, status, participant_role);

create table if not exists public.resa_group_meeting_rooms (
  meeting_id uuid primary key references public.resa_group_meetings(id) on delete cascade,
  channel_name text not null unique,
  provider text not null,
  provider_room_id text unique,
  provider_room_url text,
  status text not null default 'READY' check (status in ('READY', 'OPEN', 'CLOSED', 'FAILED')),
  max_participants integer not null default 100 check (max_participants between 2 and 200),
  locked boolean not null default false,
  lock_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resa_group_meeting_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.resa_group_meetings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'MEETING_CREATED', 'INVITATION_SENT', 'INVITATION_ACCEPTED', 'INVITATION_DECLINED',
    'PARTICIPANT_JOINED', 'PARTICIPANT_LEFT', 'PARTICIPANT_REMOVED', 'ROLE_CHANGED',
    'ROOM_OPENED', 'ROOM_CLOSED', 'ROOM_LOCKED', 'ROOM_UNLOCKED',
    'SCREEN_SHARE_STARTED', 'SCREEN_SHARE_STOPPED', 'MODERATOR_ACTION', 'MEETING_ENDED'
  )),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists resa_group_meeting_events_timeline_idx
  on public.resa_group_meeting_events (meeting_id, created_at asc);

create table if not exists public.resa_group_meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.resa_group_meetings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index if not exists resa_group_meeting_messages_timeline_idx
  on public.resa_group_meeting_messages (meeting_id, created_at asc);

create or replace function private.resa_is_group_meeting_member(
  p_meeting_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select exists (
    select 1
    from public.resa_group_meeting_participants p
    where p.meeting_id = p_meeting_id
      and p_user_id = auth.uid()
      and p.user_id = p_user_id
      and p.status in ('INVITED', 'ACCEPTED', 'PRESENT', 'LEFT')
  );
$function$;

create or replace function private.resa_is_group_meeting_host(
  p_meeting_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select exists (
    select 1
    from public.resa_group_meeting_participants p
    where p.meeting_id = p_meeting_id
      and p_user_id = auth.uid()
      and p.user_id = p_user_id
      and p.participant_role = 'HOST'
      and p.status in ('ACCEPTED', 'PRESENT')
  );
$function$;

create or replace function private.resa_is_group_meeting_moderator(
  p_meeting_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select exists (
    select 1
    from public.resa_group_meeting_participants p
    where p.meeting_id = p_meeting_id
      and p_user_id = auth.uid()
      and p.user_id = p_user_id
      and p.participant_role in ('HOST', 'MODERATOR')
      and p.status in ('ACCEPTED', 'PRESENT')
  );
$function$;

revoke all on function private.resa_is_group_meeting_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.resa_is_group_meeting_host(uuid, uuid) from public, anon, authenticated;
revoke all on function private.resa_is_group_meeting_moderator(uuid, uuid) from public, anon, authenticated;
grant execute on function private.resa_is_group_meeting_member(uuid, uuid) to authenticated;
grant execute on function private.resa_is_group_meeting_host(uuid, uuid) to authenticated;
grant execute on function private.resa_is_group_meeting_moderator(uuid, uuid) to authenticated;

create or replace function private.resa_group_meeting_add_host()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  insert into public.resa_group_meeting_participants (
    meeting_id, user_id, participant_role, status
  ) values (
    new.id, new.host_user_id, 'HOST', 'ACCEPTED'
  );
  return new;
end;
$function$;

revoke all on function private.resa_group_meeting_add_host() from public, anon, authenticated;
drop trigger if exists resa_group_meeting_add_host on public.resa_group_meetings;
create trigger resa_group_meeting_add_host
after insert on public.resa_group_meetings
for each row execute function private.resa_group_meeting_add_host();

create or replace function private.resa_group_meeting_guard_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if row(new.id, new.host_user_id, new.created_at)
     is distinct from row(old.id, old.host_user_id, old.created_at) then
    raise exception 'Group meeting identity fields are immutable' using errcode = '42501';
  end if;

  if old.status = 'SCHEDULED' and new.status not in ('SCHEDULED', 'OPEN', 'CANCELLED') then
    raise exception 'Invalid group meeting transition from SCHEDULED' using errcode = '42501';
  elsif old.status = 'OPEN' and new.status not in ('OPEN', 'ENDED') then
    raise exception 'Invalid group meeting transition from OPEN' using errcode = '42501';
  elsif old.status in ('ENDED', 'CANCELLED') and new.status is distinct from old.status then
    raise exception 'A finished group meeting cannot be reopened' using errcode = '42501';
  end if;

  if old.started_at is not null and new.started_at is distinct from old.started_at then
    raise exception 'Group meeting start time is immutable once set' using errcode = '42501';
  end if;
  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'Group meeting end time is immutable once set' using errcode = '42501';
  end if;
  if old.status = 'SCHEDULED' and new.status = 'OPEN' and new.started_at is null then
    raise exception 'An opened group meeting must have started_at' using errcode = '42501';
  end if;
  if old.status = 'OPEN' and new.status = 'ENDED' and new.ended_at is null then
    raise exception 'An ended group meeting must have ended_at' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_group_meeting_guard_update on public.resa_group_meetings;
create trigger resa_group_meeting_guard_update
before update on public.resa_group_meetings
for each row execute function private.resa_group_meeting_guard_update();

create or replace function private.resa_group_meeting_participant_guard_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if row(new.meeting_id, new.user_id, new.invited_by, new.created_at)
     is distinct from row(old.meeting_id, old.user_id, old.invited_by, old.created_at) then
    raise exception 'Group meeting participant identity is immutable' using errcode = '42501';
  end if;

  if new.participant_role is distinct from old.participant_role then
    if old.participant_role = 'HOST' or new.participant_role = 'HOST' then
      raise exception 'The meeting host role is immutable' using errcode = '42501';
    end if;
    if not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      if not private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid())
         or new.participant_role not in ('PRESENTER', 'PARTICIPANT', 'VIEWER') then
        raise exception 'Only the host can appoint moderators; moderators may grant presenter status' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.participant_role = 'HOST' then
      raise exception 'The meeting host cannot be removed or leave the meeting' using errcode = '42501';
    end if;
    if old.participant_role = 'MODERATOR'
       and new.status = 'REMOVED'
       and not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      raise exception 'Only the host can remove another moderator' using errcode = '42501';
    end if;
    if not (
      (
        auth.uid() = old.user_id
        and (
          (old.status = 'INVITED' and new.status in ('ACCEPTED', 'DECLINED'))
          or (old.status = 'ACCEPTED' and new.status in ('PRESENT', 'LEFT'))
          or (old.status = 'PRESENT' and new.status = 'LEFT')
        )
      )
      or private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid())
    ) then
      raise exception 'Not authorized to change this participant status' using errcode = '42501';
    end if;
  end if;

  if new.status = 'PRESENT' and new.joined_at is null then
    raise exception 'A present participant must have joined_at' using errcode = '42501';
  end if;
  if new.status = 'LEFT' and old.status = 'PRESENT' and new.left_at is null then
    raise exception 'A leaving participant must have left_at' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_group_meeting_participant_guard_update on public.resa_group_meeting_participants;
create trigger resa_group_meeting_participant_guard_update
before update on public.resa_group_meeting_participants
for each row execute function private.resa_group_meeting_participant_guard_update();

create or replace function private.set_resa_group_meeting_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists resa_group_meetings_updated_at on public.resa_group_meetings;
create trigger resa_group_meetings_updated_at
before update on public.resa_group_meetings
for each row execute function private.set_resa_group_meeting_updated_at();

drop trigger if exists resa_group_meeting_rooms_updated_at on public.resa_group_meeting_rooms;
create trigger resa_group_meeting_rooms_updated_at
before update on public.resa_group_meeting_rooms
for each row execute function private.set_resa_group_meeting_updated_at();

alter table public.resa_group_meetings enable row level security;
alter table public.resa_group_meeting_participants enable row level security;
alter table public.resa_group_meeting_rooms enable row level security;
alter table public.resa_group_meeting_events enable row level security;
alter table public.resa_group_meeting_messages enable row level security;

revoke all on table public.resa_group_meetings,
  public.resa_group_meeting_participants,
  public.resa_group_meeting_rooms,
  public.resa_group_meeting_events,
  public.resa_group_meeting_messages
from public, anon;

grant usage on schema private to authenticated;
grant select, insert, update on table public.resa_group_meetings to authenticated;
grant select, insert, update on table public.resa_group_meeting_participants to authenticated;
grant select, insert, update on table public.resa_group_meeting_rooms to authenticated;
grant select, insert on table public.resa_group_meeting_events to authenticated;
grant select, insert on table public.resa_group_meeting_messages to authenticated;

drop policy if exists resa_group_meetings_read on public.resa_group_meetings;
create policy resa_group_meetings_read on public.resa_group_meetings
for select to authenticated
using (
  visibility = 'PUBLIC'
  or host_user_id = (select auth.uid())
  or private.resa_is_group_meeting_member(id, (select auth.uid()))
);

drop policy if exists resa_group_meetings_insert on public.resa_group_meetings;
create policy resa_group_meetings_insert on public.resa_group_meetings
for insert to authenticated
with check (
  host_user_id = (select auth.uid())
  and status = 'SCHEDULED'
);

drop policy if exists resa_group_meetings_update on public.resa_group_meetings;
create policy resa_group_meetings_update on public.resa_group_meetings
for update to authenticated
using (host_user_id = (select auth.uid()))
with check (host_user_id = (select auth.uid()));

drop policy if exists resa_group_meeting_participants_read on public.resa_group_meeting_participants;
create policy resa_group_meeting_participants_read on public.resa_group_meeting_participants
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_member(meeting_id, (select auth.uid()))
);

drop policy if exists resa_group_meeting_participants_insert on public.resa_group_meeting_participants;
create policy resa_group_meeting_participants_insert on public.resa_group_meeting_participants
for insert to authenticated
with check (
  (
    private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid()))
    and status = 'INVITED'
    and (
      participant_role in ('PARTICIPANT', 'VIEWER')
      or (
        participant_role = 'MODERATOR'
        and private.resa_is_group_meeting_host(meeting_id, (select auth.uid()))
      )
    )
  )
  or (
    user_id = (select auth.uid())
    and participant_role = 'VIEWER'
    and status = 'ACCEPTED'
    and exists (
      select 1 from public.resa_group_meetings m
      where m.id = meeting_id
        and m.visibility = 'PUBLIC'
        and m.status in ('SCHEDULED', 'OPEN')
    )
  )
);

drop policy if exists resa_group_meeting_participants_update on public.resa_group_meeting_participants;
create policy resa_group_meeting_participants_update on public.resa_group_meeting_participants
for update to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid()))
);

drop policy if exists resa_group_meeting_rooms_read on public.resa_group_meeting_rooms;
create policy resa_group_meeting_rooms_read on public.resa_group_meeting_rooms
for select to authenticated
using (private.resa_is_group_meeting_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_rooms_insert on public.resa_group_meeting_rooms;
create policy resa_group_meeting_rooms_insert on public.resa_group_meeting_rooms
for insert to authenticated
with check (private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_rooms_update on public.resa_group_meeting_rooms;
create policy resa_group_meeting_rooms_update on public.resa_group_meeting_rooms
for update to authenticated
using (private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid())))
with check (private.resa_is_group_meeting_moderator(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_events_read on public.resa_group_meeting_events;
create policy resa_group_meeting_events_read on public.resa_group_meeting_events
for select to authenticated
using (private.resa_is_group_meeting_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_events_insert on public.resa_group_meeting_events;
create policy resa_group_meeting_events_insert on public.resa_group_meeting_events
for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and private.resa_is_group_meeting_member(meeting_id, (select auth.uid()))
);

drop policy if exists resa_group_meeting_messages_read on public.resa_group_meeting_messages;
create policy resa_group_meeting_messages_read on public.resa_group_meeting_messages
for select to authenticated
using (private.resa_is_group_meeting_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_messages_insert on public.resa_group_meeting_messages;
create policy resa_group_meeting_messages_insert on public.resa_group_meeting_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and private.resa_is_group_meeting_member(meeting_id, (select auth.uid()))
);

revoke all on function private.resa_group_meeting_guard_update() from public, anon, authenticated;
revoke all on function private.resa_group_meeting_participant_guard_update() from public, anon, authenticated;
revoke all on function private.set_resa_group_meeting_updated_at() from public, anon, authenticated;
