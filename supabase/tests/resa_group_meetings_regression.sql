\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('97000000-0000-4000-8000-000000000001','meeting-host@example.test'),
 ('97000000-0000-4000-8000-000000000002','meeting-moderator@example.test'),
 ('97000000-0000-4000-8000-000000000003','meeting-participant@example.test'),
 ('97000000-0000-4000-8000-000000000004','meeting-outsider@example.test')
on conflict (id) do nothing;

-- Host creates a private meeting; the database trigger creates the immutable HOST participant.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_group_meetings (
  id, host_user_id, title, visibility, status, scheduled_at
) values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'Private project meeting', 'INVITE_ONLY', 'SCHEDULED', now() + interval '1 hour'
);
insert into public.resa_group_meetings (
  id, host_user_id, title, visibility, status, scheduled_at
) values (
  '97100000-0000-4000-8000-000000000002',
  '97000000-0000-4000-8000-000000000001',
  'Public project meeting', 'PUBLIC', 'SCHEDULED', now() + interval '1 hour'
);

do $test$
begin
  if not exists (
    select 1 from public.resa_group_meeting_participants
    where meeting_id='97100000-0000-4000-8000-000000000001'
      and user_id='97000000-0000-4000-8000-000000000001'
      and participant_role='HOST' and status='ACCEPTED'
  ) then
    raise exception 'Host participant was not provisioned automatically';
  end if;
end;
$test$;

-- Only the host can appoint a moderator.
insert into public.resa_group_meeting_participants (
  meeting_id, user_id, participant_role, status, invited_by
) values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000002',
  'MODERATOR', 'INVITED', '97000000-0000-4000-8000-000000000001'
);
reset role;

-- The invitee accepts their invitation; the moderator can then invite ordinary participants.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',false);
set role authenticated;
update public.resa_group_meeting_participants
set status='ACCEPTED'
where meeting_id='97100000-0000-4000-8000-000000000001'
  and user_id='97000000-0000-4000-8000-000000000002';

insert into public.resa_group_meeting_participants (
  meeting_id, user_id, participant_role, status, invited_by
) values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  'PARTICIPANT', 'INVITED', '97000000-0000-4000-8000-000000000002'
);

do $test$
begin
  begin
    insert into public.resa_group_meeting_participants (
      meeting_id, user_id, participant_role, status, invited_by
    ) values (
      '97100000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000004',
      'MODERATOR', 'INVITED', '97000000-0000-4000-8000-000000000002'
    );
    raise exception 'Moderator was able to appoint another moderator';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  begin
    update public.resa_group_meeting_participants
    set participant_role='MODERATOR'
    where meeting_id='97100000-0000-4000-8000-000000000001'
      and user_id='97000000-0000-4000-8000-000000000003';
    raise exception 'Moderator was able to elevate a participant';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.resa_group_meeting_participants
    set participant_role='MODERATOR'
    where meeting_id='97100000-0000-4000-8000-000000000001'
      and user_id='97000000-0000-4000-8000-000000000001';
    raise exception 'Moderator was able to demote the host';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.resa_group_meeting_participants
    set status='REMOVED'
    where meeting_id='97100000-0000-4000-8000-000000000001'
      and user_id='97000000-0000-4000-8000-000000000001';
    raise exception 'Moderator was able to remove the host';
  exception when insufficient_privilege then
    null;
  end;
end;
$test$;
reset role;

-- A participant accepts the invite but cannot invite, moderate or create the room.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000003',false);
set role authenticated;
update public.resa_group_meeting_participants
set status='ACCEPTED'
where meeting_id='97100000-0000-4000-8000-000000000001'
  and user_id='97000000-0000-4000-8000-000000000003';
update public.resa_group_meeting_participants
set status='PRESENT', joined_at=now()
where meeting_id='97100000-0000-4000-8000-000000000001'
  and user_id='97000000-0000-4000-8000-000000000003';

do $test$
begin
  begin
    insert into public.resa_group_meeting_participants (
      meeting_id, user_id, participant_role, status, invited_by
    ) values (
      '97100000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000004',
      'PARTICIPANT', 'INVITED', '97000000-0000-4000-8000-000000000003'
    );
    raise exception 'Ordinary participant was able to invite another user';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  begin
    insert into public.resa_group_meeting_rooms (
      meeting_id, channel_name, provider, provider_room_id
    ) values (
      '97100000-0000-4000-8000-000000000001',
      'resa:group:unauthorized', 'ZION_SFU', 'unauthorized-room'
    );
    raise exception 'Ordinary participant was able to create a media room';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end;
$test$;

insert into public.resa_group_meeting_messages(meeting_id, sender_id, body)
values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  'Meeting chat is restricted to admitted participants.'
);

insert into public.resa_group_meeting_events(meeting_id, actor_user_id, event_type, payload)
values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  'PARTICIPANT_JOINED',
  '{"source":"regression"}'::jsonb
);
reset role;

-- Moderator can grant/revoke presenter permission dynamically, but cannot appoint another moderator.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',false);
set role authenticated;
update public.resa_group_meeting_participants
set participant_role='PRESENTER'
where meeting_id='97100000-0000-4000-8000-000000000001'
  and user_id='97000000-0000-4000-8000-000000000003';
do $test$
begin
  if not exists (
    select 1 from public.resa_group_meeting_participants
    where meeting_id='97100000-0000-4000-8000-000000000001'
      and user_id='97000000-0000-4000-8000-000000000003'
      and participant_role='PRESENTER'
  ) then
    raise exception 'Moderator could not grant presenter role';
  end if;
end;
$test$;
update public.resa_group_meeting_participants
set participant_role='PARTICIPANT'
where meeting_id='97100000-0000-4000-8000-000000000001'
  and user_id='97000000-0000-4000-8000-000000000003';
insert into public.resa_group_meeting_rooms (
  meeting_id, channel_name, provider, provider_room_id
) values (
  '97100000-0000-4000-8000-000000000001',
  'resa:group:97100000-0000-4000-8000-000000000001',
  'ZION_SFU', 'zion-group-97100000-0000-4000-8000-000000000001'
);
update public.resa_group_meeting_rooms
set locked=true, lock_reason='Regression test lock'
where meeting_id='97100000-0000-4000-8000-000000000001';
reset role;

-- Outsiders cannot discover private meeting data or read its roster, room, events or chat.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000004',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_group_meetings where id='97100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Private meeting leaked to an outsider';
  end if;
  if (select count(*) from public.resa_group_meeting_participants where meeting_id='97100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Private meeting roster leaked to an outsider';
  end if;
  if (select count(*) from public.resa_group_meeting_rooms where meeting_id='97100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Private media room leaked to an outsider';
  end if;
  if (select count(*) from public.resa_group_meeting_messages where meeting_id='97100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Private meeting chat leaked to an outsider';
  end if;
  if (select count(*) from public.resa_group_meeting_events where meeting_id='97100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Private meeting events leaked to an outsider';
  end if;
  if (select count(*) from public.resa_group_meetings where id='97100000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'Public meeting was not discoverable';
  end if;
  if has_table_privilege('authenticated','public.resa_group_meeting_events','UPDATE')
     or has_table_privilege('authenticated','public.resa_group_meeting_events','DELETE') then
    raise exception 'Authenticated clients can rewrite or delete the meeting audit log';
  end if;
end;
$test$;

-- A public visitor may join only as a viewer, never as a moderator or host.
insert into public.resa_group_meeting_participants (
  meeting_id, user_id, participant_role, status
) values (
  '97100000-0000-4000-8000-000000000002',
  '97000000-0000-4000-8000-000000000004',
  'VIEWER', 'ACCEPTED'
);

do $test$
begin
  begin
    update public.resa_group_meeting_participants
    set participant_role='MODERATOR'
    where meeting_id='97100000-0000-4000-8000-000000000002'
      and user_id='97000000-0000-4000-8000-000000000004';
    raise exception 'Public visitor was able to self-appoint as moderator';
  exception when insufficient_privilege then
    null;
  end;
  if not exists (
    select 1 from public.resa_group_meeting_participants
    where meeting_id='97100000-0000-4000-8000-000000000002'
      and user_id='97000000-0000-4000-8000-000000000004'
      and participant_role='VIEWER'
  ) then
    raise exception 'Public visitor role was elevated';
  end if;
end;
$test$;
reset role;

rollback;
select 'RESA group meeting RLS and role authorization regression passed' as result;
