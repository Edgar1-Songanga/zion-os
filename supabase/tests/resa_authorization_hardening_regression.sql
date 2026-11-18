\set ON_ERROR_STOP on

begin;

-- The privacy regression suite creates these users and profiles earlier in this workflow.
-- Permit the third member to receive calls for this isolated group-call test.
update public.profiles
set privacy = jsonb_set(coalesce(privacy, '{}'::jsonb), '{call_policy}', '"everyone"'::jsonb, true)
where id = '10000000-0000-4000-8000-000000000003';

-- Align the fixture's activation boundary with the deliberately aged test call.
update private.resa_call_expiry_config
set activated_at = now() - interval '2 minutes'
where id = true;

insert into public.resa_conversations(id, created_by, kind, title)
values
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','group','Authorization regression'),
 ('60000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','group','Authorization regression destination')
on conflict (id) do nothing;

-- The membership guard requires a real actor even though fixture setup runs as postgres.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);

insert into public.resa_conversation_members(conversation_id,user_id,role) values
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','owner'),
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','member'),
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','member'),
 ('60000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','owner'),
 ('60000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000002','member')
on conflict (conversation_id,user_id) do nothing;

-- Message authorship and ownership: another member cannot edit, reassign or delete.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_messages(id,conversation_id,sender_id,body)
values (
 '60000000-0000-4000-8000-000000000003',
 '60000000-0000-4000-8000-000000000002',
 auth.uid(),
 'Original author message'
);
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
declare v_rows integer;
begin
  begin
    update public.resa_messages set body='unauthorized edit'
    where id='60000000-0000-4000-8000-000000000003';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then raise exception 'A conversation member edited another member message'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    update public.resa_messages set sender_id=auth.uid()
    where id='60000000-0000-4000-8000-000000000003';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then raise exception 'A conversation member reassigned another member message'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.resa_messages
    where id='60000000-0000-4000-8000-000000000003';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then raise exception 'A conversation member deleted another member message'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

-- The author may edit the body, but cannot rewrite message identity or move it to another conversation.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
update public.resa_messages
set body='Edited by the author'
where id='60000000-0000-4000-8000-000000000003';

do $test$
declare v_rows integer;
begin
  begin
    update public.resa_messages
    set conversation_id='60000000-0000-4000-8000-000000000007'
    where id='60000000-0000-4000-8000-000000000003';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then raise exception 'Message author rewrote conversation identity'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$test$;

delete from public.resa_messages
where id='60000000-0000-4000-8000-000000000003';
do $test$
begin
  if exists (select 1 from public.resa_messages where id='60000000-0000-4000-8000-000000000003') then
    raise exception 'Message author could not delete their own message';
  end if;
end;
$test$;
reset role;

-- Calls: only a joined recipient can answer; only joined participants can end;
-- only recipients can decline; only the server can mark calls missed.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_calls(id,conversation_id,initiator_id,kind,status)
values (
 '60000000-0000-4000-8000-000000000004',
 '60000000-0000-4000-8000-000000000002',
 auth.uid(),'audio','ringing'
);
insert into public.resa_call_participants(call_id,user_id,status,joined_at)
values ('60000000-0000-4000-8000-000000000004',auth.uid(),'joined',now());
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
begin
  begin
    update public.resa_calls
    set status='active', answered_at=now()
    where id='60000000-0000-4000-8000-000000000004';
    raise exception 'A recipient answered without joining the call';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

insert into public.resa_call_participants(call_id,user_id,status,joined_at)
values ('60000000-0000-4000-8000-000000000004',auth.uid(),'joined',now());

-- A participant may reconnect, but cannot forge an invalid participant state or mutate another row.
update public.resa_call_participants
set status='left'
where call_id='60000000-0000-4000-8000-000000000004' and user_id=auth.uid();
update public.resa_call_participants
set status='joined'
where call_id='60000000-0000-4000-8000-000000000004' and user_id=auth.uid();

do $test$
declare v_rows integer;
begin
  begin
    update public.resa_call_participants
    set status='left'
    where call_id='60000000-0000-4000-8000-000000000004'
      and user_id='10000000-0000-4000-8000-000000000001';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then raise exception 'A recipient changed another participant state'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    update public.resa_call_participants
    set status='declined'
    where call_id='60000000-0000-4000-8000-000000000004'
      and user_id=auth.uid();
    raise exception 'A joined participant used an invalid declined transition';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

update public.resa_calls
set status='active', answered_at=now()
where id='60000000-0000-4000-8000-000000000004';

-- A conversation member who has not joined cannot end an active call.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $test$
begin
  begin
    update public.resa_calls
    set status='ended', ended_at=now()
    where id='60000000-0000-4000-8000-000000000004';
    raise exception 'A non-participant ended an active call';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

-- The joined recipient may end the active call.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
update public.resa_calls
set status='ended', ended_at=now()
where id='60000000-0000-4000-8000-000000000004';
reset role;

-- The initiator cannot decline their own call; a recipient can.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_calls(id,conversation_id,initiator_id,kind,status)
values (
 '60000000-0000-4000-8000-000000000005',
 '60000000-0000-4000-8000-000000000002',
 auth.uid(),'audio','ringing'
);
insert into public.resa_call_participants(call_id,user_id,status,joined_at)
values ('60000000-0000-4000-8000-000000000005',auth.uid(),'joined',now());
do $test$
begin
  begin
    update public.resa_calls
    set status='declined', ended_at=now()
    where id='60000000-0000-4000-8000-000000000005';
    raise exception 'Call initiator declined their own outgoing call';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
set role authenticated;
update public.resa_calls
set status='declined', ended_at=now()
where id='60000000-0000-4000-8000-000000000005';
reset role;

-- A client cannot directly set missed or expire another user's call via the RPC.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_calls(id,conversation_id,initiator_id,kind,status,created_at)
values (
 '60000000-0000-4000-8000-000000000006',
 '60000000-0000-4000-8000-000000000002',
 auth.uid(),'audio','ringing',now() - interval '1 minute'
);
insert into public.resa_call_participants(call_id,user_id,status,joined_at)
values ('60000000-0000-4000-8000-000000000006',auth.uid(),'joined',now());
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
declare v_expired boolean;
begin
  begin
    update public.resa_calls
    set status='missed', ended_at=now()
    where id='60000000-0000-4000-8000-000000000006';
    raise exception 'An authenticated client directly marked a call missed';
  exception when insufficient_privilege then null;
  end;

  select public.expire_unanswered_resa_call('60000000-0000-4000-8000-000000000006')
    into v_expired;
  if v_expired then raise exception 'A non-initiator expired another user call'; end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $test$
declare v_expired boolean;
begin
  select public.expire_unanswered_resa_call('60000000-0000-4000-8000-000000000006')
    into v_expired;
  if not v_expired then raise exception 'Call initiator could not request server-side expiry after 45 seconds'; end if;
end;
$test$;
reset role;

rollback;
