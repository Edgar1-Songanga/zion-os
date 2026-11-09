-- Allow the immutable meeting host to leave and rejoin without losing host privileges.
-- The existing status transition guard still limits the host to ACCEPTED -> PRESENT -> LEFT -> PRESENT.
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
    if old.participant_role = 'MODERATOR'
       and not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      raise exception 'Only the host can change another moderator role' using errcode = '42501';
    end if;
    if not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      if not private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid())
         or new.participant_role not in ('PRESENTER', 'PARTICIPANT', 'VIEWER') then
        raise exception 'Only the host can appoint moderators; moderators may grant presenter status' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.participant_role = 'HOST'
       and new.status in ('REMOVED', 'DECLINED') then
      raise exception 'The meeting host cannot be removed or decline the meeting' using errcode = '42501';
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
          or (old.status = 'LEFT' and new.status = 'PRESENT')
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
  if new.status = 'PRESENT' and not exists (
    select 1 from public.resa_group_meetings m
    where m.id = new.meeting_id and m.status = 'OPEN'
  ) then
    raise exception 'Participants can only enter an open meeting' using errcode = '42501';
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
    and exists (
      select 1 from public.resa_group_meetings m
      where m.id = meeting_id and m.status in ('SCHEDULED', 'OPEN')
    )
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
  and exists (
    select 1 from public.resa_group_meetings m
    where m.id = meeting_id and m.status = 'OPEN'
  )
);;

