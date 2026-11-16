\\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','private-contact-viewer@example.test'),
 ('96000000-0000-4000-8000-000000000002','private-contact-owner@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('96000000-0000-4000-8000-000000000001','Private Contact Viewer','{}'),
 ('96000000-0000-4000-8000-000000000002','Private Contact Owner','{"profile_visibility":"private","message_policy":"everyone","call_policy":"everyone","group_invite_policy":"everyone","follow_policy":"auto"}')
on conflict (id) do update set privacy=excluded.privacy;

insert into public.resa_conversations(id,created_by,kind,title) values
 ('96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000001','direct','Pre-existing direct thread')
on conflict (id) do nothing;

insert into public.resa_conversation_members(conversation_id,user_id,role) values
 ('96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000001','owner'),
 ('96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000002','member')
on conflict (conversation_id,user_id) do nothing;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set local role authenticated;

do $test$
begin
  if private.resa_contact_allowed(auth.uid(),'96000000-0000-4000-8000-000000000002','message_policy') then
    raise exception 'A non-follower can message a private profile';
  end if;
  if private.resa_contact_allowed(auth.uid(),'96000000-0000-4000-8000-000000000002','call_policy') then
    raise exception 'A non-follower can call a private profile';
  end if;
  if private.resa_contact_allowed(auth.uid(),'96000000-0000-4000-8000-000000000002','group_invite_policy') then
    raise exception 'A non-follower can invite a private profile to a group';
  end if;

  begin
    perform public.resa_create_conversation(
      array['96000000-0000-4000-8000-000000000002'::uuid],
      'Must be rejected',
      'message'
    );
    raise exception 'Direct conversation creation bypassed private profile visibility';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.resa_messages(conversation_id,sender_id,body)
    values ('96000000-0000-4000-8000-000000000101',auth.uid(),'Must be rejected');
    raise exception 'Existing direct conversation bypassed private profile visibility';
  exception when insufficient_privilege then
    null;
  end;

  -- Follow eligibility remains independent so a private-profile follow/request
  -- flow is not accidentally disabled by the contact-visibility guard.
  if not private.resa_contact_allowed(auth.uid(),'96000000-0000-4000-8000-000000000002','follow_policy') then
    raise exception 'Private profile follow eligibility was incorrectly disabled';
  end if;
end;
$test$;

rollback;
