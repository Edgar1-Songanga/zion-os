\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','caller@example.test'),
 ('00000000-0000-4000-8000-000000000002','member@example.test'),
 ('00000000-0000-4000-8000-000000000003','outsider@example.test');

insert into public.resa_conversations(id,created_by) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');

insert into public.resa_conversation_members(conversation_id,user_id) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');

insert into public.resa_calls(id,conversation_id,initiator_id,kind,status) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','audio','ringing'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','video','ringing');

insert into public.resa_call_participants(call_id,user_id,status) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','joined');

-- Seed a signal addressed to a non-member so the SELECT policy can be checked.
insert into public.resa_call_signals(call_id,sender_id,recipient_id,kind,payload) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','ice','{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

-- A valid ringing -> active transition remains available to conversation members.
update public.resa_calls
set status='active', answered_at=now()
where id='20000000-0000-4000-8000-000000000001';

-- Even a member of both conversations cannot move a call to another conversation.
do $test$
declare changed integer;
begin
  begin
    update public.resa_calls
    set conversation_id='10000000-0000-4000-8000-000000000002'
    where id='20000000-0000-4000-8000-000000000001';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Call row unexpectedly hidden from its member'; end if;
    raise exception 'Call conversation_id mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$test$;

do $test$
declare changed integer;
begin
  begin
    update public.resa_calls
    set initiator_id='00000000-0000-4000-8000-000000000002'
    where id='20000000-0000-4000-8000-000000000001';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Call row unexpectedly hidden from its member'; end if;
    raise exception 'Call initiator_id mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$test$;

-- Signaling is limited to another member of the same active call.
do $test$
begin
  begin
    insert into public.resa_call_signals(call_id,sender_id,recipient_id,kind,payload)
    values ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','ice','{}'::jsonb);
    raise exception 'Signal to a non-member unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$test$;

insert into public.resa_call_signals(call_id,sender_id,recipient_id,kind,payload)
values ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','ice','{}'::jsonb);

-- Participant identity cannot be reassigned to another call in the same conversation.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $test$
declare changed integer;
begin
  begin
    update public.resa_call_participants
    set call_id='20000000-0000-4000-8000-000000000002'
    where call_id='20000000-0000-4000-8000-000000000001'
      and user_id='00000000-0000-4000-8000-000000000002';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Participant row unexpectedly hidden from its owner'; end if;
    raise exception 'Participant call_id mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$test$;

-- Terminal calls cannot be reopened.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
update public.resa_calls
set status='ended', ended_at=now()
where id='20000000-0000-4000-8000-000000000001';
do $test$
declare changed integer;
begin
  begin
    update public.resa_calls
    set status='active'
    where id='20000000-0000-4000-8000-000000000001';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Finished call unexpectedly hidden from its member'; end if;
    raise exception 'Finished call was reopened';
  exception when insufficient_privilege then null;
  end;
end
$test$;

-- An unanswered ringing call can expire to missed and must remain terminal.
update public.resa_calls
set status='missed', ended_at=now()
where id='20000000-0000-4000-8000-000000000002';
do $test$
declare changed integer;
begin
  if not exists (
    select 1 from public.resa_calls
    where id='20000000-0000-4000-8000-000000000002'
      and status='missed' and ended_at is not null
  ) then
    raise exception 'Ringing call did not transition to missed with ended_at';
  end if;
  begin
    update public.resa_calls
    set status='active', answered_at=now()
    where id='20000000-0000-4000-8000-000000000002';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Missed call unexpectedly hidden from its member'; end if;
    raise exception 'Missed call was reopened';
  exception when insufficient_privilege then null;
  end;
end
$test$;

-- Server expiry runs once per minute and excludes calls predating activation.
reset role;
update private.resa_call_expiry_config
set activated_at = clock_timestamp() - interval '5 minutes'
where id = true;

insert into public.resa_calls(id,conversation_id,initiator_id,kind,status,created_at) values
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','audio','ringing',clock_timestamp() - interval '2 minutes'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','audio','ringing',clock_timestamp() - interval '10 minutes');

do $test$
declare expired integer;
begin
  expired := private.expire_unanswered_resa_calls();
  if expired <> 1 then
    raise exception 'Expected exactly one eligible unanswered call to expire, got %', expired;
  end if;
  if not exists (
    select 1 from public.resa_calls
    where id='20000000-0000-4000-8000-000000000003'
      and status='missed' and ended_at is not null
  ) then
    raise exception 'Eligible unanswered call was not marked missed';
  end if;
  if not exists (
    select 1 from public.resa_calls
    where id='20000000-0000-4000-8000-000000000004'
      and status='ringing' and ended_at is null
  ) then
    raise exception 'Pre-activation historical call was modified';
  end if;
  if not exists (
    select 1 from cron.job
    where jobname='resa-expire-unanswered-calls'
      and schedule='* * * * *'
      and command='select private.expire_unanswered_resa_calls();'
  ) then
    raise exception 'Server expiry cron job is not scheduled every minute';
  end if;
end
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $test$
declare changed integer;
begin
  begin
    update public.resa_calls
    set status='active', answered_at=now()
    where id='20000000-0000-4000-8000-000000000003';
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Missed call unexpectedly hidden from its member'; end if;
    raise exception 'Server-expired missed call was reopened';
  exception when insufficient_privilege then null;
  end;
end
$test$;

reset role;

-- An outsider cannot read call signaling addressed to them for a call they do not belong to.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $test$
declare visible integer;
begin
  select count(*) into visible from public.resa_call_signals
  where recipient_id='00000000-0000-4000-8000-000000000003';
  if visible <> 0 then raise exception 'Outsider can read call signaling'; end if;
end
$test$;

rollback;
