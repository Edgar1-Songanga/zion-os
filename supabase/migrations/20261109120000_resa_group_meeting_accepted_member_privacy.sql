-- Invited users may view meeting metadata and answer their invitation, but not access room content.
create or replace function private.resa_is_group_meeting_accepted_member(
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
      and p.status in ('ACCEPTED', 'PRESENT', 'LEFT')
  );
$function$;

revoke all on function private.resa_is_group_meeting_accepted_member(uuid, uuid) from public, anon, authenticated;
grant execute on function private.resa_is_group_meeting_accepted_member(uuid, uuid) to authenticated;

drop policy if exists resa_group_meeting_participants_read on public.resa_group_meeting_participants;
create policy resa_group_meeting_participants_read on public.resa_group_meeting_participants
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid()))
);

drop policy if exists resa_group_meeting_rooms_read on public.resa_group_meeting_rooms;
create policy resa_group_meeting_rooms_read on public.resa_group_meeting_rooms
for select to authenticated
using (private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_events_read on public.resa_group_meeting_events;
create policy resa_group_meeting_events_read on public.resa_group_meeting_events
for select to authenticated
using (private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_events_insert on public.resa_group_meeting_events;
create policy resa_group_meeting_events_insert on public.resa_group_meeting_events
for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid()))
);

drop policy if exists resa_group_meeting_messages_read on public.resa_group_meeting_messages;
create policy resa_group_meeting_messages_read on public.resa_group_meeting_messages
for select to authenticated
using (private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid())));

drop policy if exists resa_group_meeting_messages_insert on public.resa_group_meeting_messages;
create policy resa_group_meeting_messages_insert on public.resa_group_meeting_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and private.resa_is_group_meeting_accepted_member(meeting_id, (select auth.uid()))
  and exists (
    select 1 from public.resa_group_meetings m
    where m.id = meeting_id and m.status = 'OPEN'
  )
);
