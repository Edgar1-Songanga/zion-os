\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','actor@example.test'),
 ('10000000-0000-4000-8000-000000000002','call-only@example.test'),
 ('10000000-0000-4000-8000-000000000003','call-blocked@example.test'),
 ('10000000-0000-4000-8000-000000000004','group-one@example.test'),
 ('10000000-0000-4000-8000-000000000005','group-two@example.test'),
 ('10000000-0000-4000-8000-000000000006','private-profile@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('10000000-0000-4000-8000-000000000001','Actor','{}'),
 ('10000000-0000-4000-8000-000000000002','Call Only','{"message_policy":"none","call_policy":"everyone","group_invite_policy":"none","follow_policy":"none"}'),
 ('10000000-0000-4000-8000-000000000003','Call Blocked','{"message_policy":"everyone","call_policy":"none","group_invite_policy":"everyone","follow_policy":"auto"}'),
 ('10000000-0000-4000-8000-000000000004','Group One','{"group_invite_policy":"everyone"}'),
 ('10000000-0000-4000-8000-000000000005','Group Two','{"group_invite_policy":"everyone"}'),
 ('10000000-0000-4000-8000-000000000006','Private Profile','{"profile_visibility":"private","follow_policy":"auto"}')
on conflict (id) do update set display_name=excluded.display_name, privacy=excluded.privacy;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
set role authenticated;

do $test$
declare
  v_call_conversation uuid;
  v_group_conversation uuid;
  v_profile record;
begin
  select (public.resa_create_conversation(
    array['10000000-0000-4000-8000-000000000002'::uuid],
    'Call-only conversation',
    'call'
  )).id into v_call_conversation;

  if v_call_conversation is null then raise exception 'call-only conversation was not created'; end if;

  insert into public.resa_calls(conversation_id,initiator_id,kind)
  values (v_call_conversation, auth.uid(), 'audio');

  begin
    insert into public.resa_messages(conversation_id,sender_id,body)
    values (v_call_conversation, auth.uid(), 'This message must be blocked');
    raise exception 'message policy was bypassed for call-only conversation';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.resa_create_conversation(
      array['10000000-0000-4000-8000-000000000003'::uuid],
      'Blocked call',
      'call'
    );
    raise exception 'call policy was bypassed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.resa_create_conversation(
      array['10000000-0000-4000-8000-000000000002'::uuid],
      'Blocked message',
      'message'
    );
    raise exception 'message policy was bypassed at conversation creation';
  exception when insufficient_privilege then
    null;
  end;

  select (public.resa_create_conversation(
    array[
      '10000000-0000-4000-8000-000000000004'::uuid,
      '10000000-0000-4000-8000-000000000005'::uuid
    ],
    'Allowed group',
    'message'
  )).id into v_group_conversation;

  begin
    insert into public.resa_conversation_members(conversation_id,user_id,role)
    values (v_group_conversation,'10000000-0000-4000-8000-000000000002'::uuid,'member');
    raise exception 'group invite policy was bypassed by direct membership insert';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.resa_follows(follower_id,followed_id)
    values (auth.uid(),'10000000-0000-4000-8000-000000000002'::uuid);
    raise exception 'follow policy was bypassed';
  exception when insufficient_privilege then
    null;
  end;

  select * into v_profile
  from public.resa_public_profile('10000000-0000-4000-8000-000000000006'::uuid);

  if not v_profile.private_locked or v_profile.display_name is not null or not v_profile.follow_allowed then
    raise exception 'private profile projection exposed fields or hid permitted follow action';
  end if;

  insert into public.resa_follows(follower_id,followed_id)
  values (auth.uid(),'10000000-0000-4000-8000-000000000006'::uuid);
  select * into v_profile
  from public.resa_public_profile('10000000-0000-4000-8000-000000000006'::uuid);
  if v_profile.private_locked or v_profile.display_name is null then
    raise exception 'following an unlocked private profile did not reveal permitted profile fields';
  end if;
end;
$test$;

reset role;
