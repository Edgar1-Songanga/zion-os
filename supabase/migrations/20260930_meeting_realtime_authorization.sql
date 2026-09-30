create policy "zion_meeting_broadcast_receive"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) ~ '^zion:meeting:[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.governance_meeting_participants p
    join public.governance_meeting_rooms r on r.meeting_id = p.meeting_id
    where p.meeting_id = split_part((select realtime.topic()), ':', 3)::uuid
      and p.user_id = (select auth.uid())
      and p.status in ('ACCEPTED', 'PRESENT')
      and r.status = 'OPEN'
      and r.locked = false
  )
);

create policy "zion_meeting_broadcast_send"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and (select realtime.topic()) ~ '^zion:meeting:[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.governance_meeting_participants p
    join public.governance_meeting_rooms r on r.meeting_id = p.meeting_id
    where p.meeting_id = split_part((select realtime.topic()), ':', 3)::uuid
      and p.user_id = (select auth.uid())
      and p.status in ('ACCEPTED', 'PRESENT')
      and r.status = 'OPEN'
      and r.locked = false
  )
);

create policy "zion_meeting_presence_receive"
on realtime.messages
for select
to authenticated
using (
  extension = 'presence'
  and (select realtime.topic()) ~ '^zion:meeting:[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.governance_meeting_participants p
    join public.governance_meeting_rooms r on r.meeting_id = p.meeting_id
    where p.meeting_id = split_part((select realtime.topic()), ':', 3)::uuid
      and p.user_id = (select auth.uid())
      and p.status in ('ACCEPTED', 'PRESENT')
      and r.status = 'OPEN'
      and r.locked = false
  )
);

create policy "zion_meeting_presence_send"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and (select realtime.topic()) ~ '^zion:meeting:[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.governance_meeting_participants p
    join public.governance_meeting_rooms r on r.meeting_id = p.meeting_id
    where p.meeting_id = split_part((select realtime.topic()), ':', 3)::uuid
      and p.user_id = (select auth.uid())
      and p.status in ('ACCEPTED', 'PRESENT')
      and r.status = 'OPEN'
      and r.locked = false
  )
);