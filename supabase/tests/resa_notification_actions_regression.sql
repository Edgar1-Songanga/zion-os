-- Use the seeded caller identity for database-enforced call creation checks.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);

-- Verify existing call rows are reconciled by the migration backfill.
do $test$
declare
  v_row record;
begin
  select title, body, data into v_row
  from public.notifications
  where user_id = '10000000-0000-4000-8000-000000000002'
    and data ->> 'call_id' = '30000000-0000-4000-8000-000000000001';

  if not found then raise exception 'Existing call notification was lost'; end if;
  if v_row.title <> 'Chamada perdida' then raise exception 'Expected missed-call title, got %', v_row.title; end if;
  if position('Samuel Test' in v_row.body) = 0 then raise exception 'Missed-call notification does not identify the caller: %', v_row.body; end if;
  if v_row.data ->> 'call_status' <> 'missed' then raise exception 'Missed-call status was not reconciled'; end if;
end;
$test$;

-- The message trigger must create a conversation-style notification with sender identity and preview.
do $test$
begin
  if auth.uid() <> '10000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'Regression fixture did not retain the authenticated caller';
  end if;
  if not private.resa_contact_allowed(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'message_policy'
  ) then
    raise exception 'Regression recipient profile must allow direct messages';
  end if;
end;
$test$;

drop trigger if exists trg_resa_message_core_notification on public.resa_messages;
create trigger trg_resa_message_core_notification
  after insert on public.resa_messages
  for each row execute function public.resa_message_core_notification();

insert into public.resa_messages(id, conversation_id, sender_id, body)
values (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'A reunião começa às 18 horas.'
);

do $test$
declare
  v_row record;
begin
  select title, body, data into v_row
  from public.notifications
  where user_id = '10000000-0000-4000-8000-000000000002'
    and data ->> 'message_id' = '40000000-0000-4000-8000-000000000001';

  if not found then raise exception 'Message notification was not created'; end if;
  if v_row.title <> 'Samuel Test' then raise exception 'Expected sender name as message title, got %', v_row.title; end if;
  if v_row.body <> 'A reunião começa às 18 horas.' then raise exception 'Message preview does not match the message body'; end if;
  if v_row.data ->> 'conversation_id' <> '20000000-0000-4000-8000-000000000001' then raise exception 'Message conversation link is missing'; end if;
end;
$test$;

-- A newly missed call updates its existing notification instead of creating a stale ring alert.
insert into public.resa_calls(id, conversation_id, initiator_id, kind, status)
values (
  '30000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'video',
  'ringing'
);

insert into public.notifications(user_id, type, title, body, channel, priority, data)
values (
  '10000000-0000-4000-8000-000000000002',
  'resa.call.video',
  'Videochamada recebida no RESA',
  'Tens uma chamada a chegar.',
  'in_app',
  'critical',
  jsonb_build_object(
    'call_id', '30000000-0000-4000-8000-000000000002',
    'conversation_id', '20000000-0000-4000-8000-000000000001',
    'kind', 'video',
    'initiator_id', '10000000-0000-4000-8000-000000000001',
    'call_status', 'ringing'
  )
);

update public.resa_calls
set status = 'missed', ended_at = now()
where id = '30000000-0000-4000-8000-000000000002';

do $test$
declare
  v_row record;
  v_count integer;
begin
  select title, body, data into v_row
  from public.notifications
  where user_id = '10000000-0000-4000-8000-000000000002'
    and data ->> 'call_id' = '30000000-0000-4000-8000-000000000002';

  if not found then raise exception 'New missed-call notification was not updated'; end if;
  if v_row.title <> 'Chamada perdida' then raise exception 'Expected missed video-call title, got %', v_row.title; end if;
  if position('Samuel Test' in v_row.body) = 0 then raise exception 'Missed video-call notification does not identify the caller'; end if;
  if v_row.data ->> 'call_status' <> 'missed' then raise exception 'New call status was not persisted'; end if;

  select count(*) into v_count
  from public.notifications
  where user_id = '10000000-0000-4000-8000-000000000002'
    and data ->> 'call_id' = '30000000-0000-4000-8000-000000000002';
  if v_count <> 1 then raise exception 'Call lifecycle created duplicate notification rows: %', v_count; end if;
end;
$test$;

-- Answered calls keep a useful completed-call entry after hang-up.
insert into public.resa_calls(id, conversation_id, initiator_id, kind, status)
values (
  '30000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'audio',
  'ringing'
);

insert into public.notifications(user_id, type, title, body, channel, priority, data)
values (
  '10000000-0000-4000-8000-000000000002',
  'resa.call.audio',
  'Chamada de áudio recebida no RESA',
  'Tens uma chamada a chegar.',
  'in_app',
  'critical',
  jsonb_build_object(
    'call_id', '30000000-0000-4000-8000-000000000003',
    'conversation_id', '20000000-0000-4000-8000-000000000001',
    'kind', 'audio',
    'initiator_id', '10000000-0000-4000-8000-000000000001',
    'call_status', 'ringing'
  )
);

update public.resa_calls
set status = 'active', answered_at = now()
where id = '30000000-0000-4000-8000-000000000003';

update public.resa_calls
set status = 'ended', ended_at = now()
where id = '30000000-0000-4000-8000-000000000003';

do $test$
declare
  v_row record;
begin
  select title, body, data into v_row
  from public.notifications
  where user_id = '10000000-0000-4000-8000-000000000002'
    and data ->> 'call_id' = '30000000-0000-4000-8000-000000000003';

  if not found then raise exception 'Completed-call notification was not retained'; end if;
  if v_row.title <> 'Chamada terminada' then raise exception 'Expected completed-call title, got %', v_row.title; end if;
  if position('Samuel Test' in v_row.body) = 0 then raise exception 'Completed-call notification does not identify the caller'; end if;
  if v_row.data ->> 'call_status' <> 'ended' then raise exception 'Completed-call status was not persisted'; end if;
end;
$test$;
