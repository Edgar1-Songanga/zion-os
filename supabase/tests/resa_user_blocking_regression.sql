\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('95000000-0000-4000-8000-000000000001','resa-block-a@example.test'),
 ('95000000-0000-4000-8000-000000000002','resa-block-b@example.test')
on conflict (id) do nothing;
insert into public.profiles(id,display_name,privacy) values
 ('95000000-0000-4000-8000-000000000001','Blocker', '{"profile_visibility":"public","bio_visibility":"public"}'::jsonb),
 ('95000000-0000-4000-8000-000000000002','Blocked', '{"profile_visibility":"public","bio_visibility":"public"}'::jsonb)
on conflict (id) do nothing;
insert into public.resa_contents(id,author_id,type,title,body,visibility)
values
 ('95000000-0000-4000-8000-000000000011','95000000-0000-4000-8000-000000000001','text','A post','From A','public'),
 ('95000000-0000-4000-8000-000000000012','95000000-0000-4000-8000-000000000002','text','B post','From B','public')
on conflict (id) do nothing;
insert into public.resa_follows(follower_id,followed_id) values
 ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002'),
 ('95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000001')
on conflict do nothing;


select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);

-- Existing direct and group conversations must not become a bypass after a block.
-- Seed these relationships before the blocker is applied, as real users may block
-- someone with whom they already have a conversation.
insert into public.resa_conversations(id,created_by,kind,title) values
 ('95000000-0000-4000-8000-000000000101','95000000-0000-4000-8000-000000000001','direct','Existing direct'),
 ('95000000-0000-4000-8000-000000000102','95000000-0000-4000-8000-000000000001','group','Existing group');
insert into public.resa_conversation_members(conversation_id,user_id,role) values
 ('95000000-0000-4000-8000-000000000101','95000000-0000-4000-8000-000000000001','owner'),
 ('95000000-0000-4000-8000-000000000101','95000000-0000-4000-8000-000000000002','member'),
 ('95000000-0000-4000-8000-000000000102','95000000-0000-4000-8000-000000000001','owner');

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_user_blocks(blocker_id,blocked_id)
values ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002')
on conflict do nothing;

do $test$
declare
  v_profile record;
begin
  if private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','message_policy') then
    raise exception 'Blocked profile still accepts direct messages';
  end if;

  begin
    perform public.resa_create_conversation(
      array['95000000-0000-4000-8000-000000000002'::uuid],
      'Blocked after block',
      'message'
    );
    raise exception 'Blocked user could create a new direct conversation';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_messages(conversation_id,sender_id,body)
    values ('95000000-0000-4000-8000-000000000101',auth.uid(),'Blocked after block');
    raise exception 'Existing direct conversation bypassed the block for messages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_calls(conversation_id,initiator_id,kind)
    values ('95000000-0000-4000-8000-000000000101',auth.uid(),'audio');
    raise exception 'Existing direct conversation bypassed the block for calls';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_conversation_members(conversation_id,user_id,role)
    values ('95000000-0000-4000-8000-000000000102','95000000-0000-4000-8000-000000000002','member');
    raise exception 'Existing group conversation bypassed the block for invitations';
  exception when insufficient_privilege then null;
  end;

  if private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','call_policy') then
    raise exception 'Blocked profile still accepts calls';
  end if;
  if private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','follow_policy') then
    raise exception 'Blocked profile still accepts follows';
  end if;
  if (select count(*) from public.resa_contents where id='95000000-0000-4000-8000-000000000012') <> 0 then
    raise exception 'Blocker can still see blocked member content';
  end if;
  if (select count(*) from public.resa_contents where id='95000000-0000-4000-8000-000000000011') <> 1 then
    raise exception 'Blocker cannot see own content';
  end if;
  if (select count(*) from public.resa_user_blocks where blocker_id=auth.uid()) <> 1 then
    raise exception 'Blocker cannot see own block list';
  end if;
  select * into v_profile
  from public.resa_public_profile('95000000-0000-4000-8000-000000000002'::uuid);
  if not v_profile.private_locked or v_profile.display_name is not null then
    raise exception 'Blocker can still discover the blocked member profile';
  end if;
  if exists (select 1 from public.resa_profiles_for_ids(array['95000000-0000-4000-8000-000000000002'::uuid])) then
    raise exception 'Blocked member still appears in profile hydration/search results';
  end if;
  if exists (select 1 from public.resa_search_profiles('Blocked', 20) where id='95000000-0000-4000-8000-000000000002'::uuid) then
    raise exception 'Blocked member still appears in profile search';
  end if;
  if (select count(*) from public.resa_follows
      where (follower_id='95000000-0000-4000-8000-000000000001' and followed_id='95000000-0000-4000-8000-000000000002')
         or (follower_id='95000000-0000-4000-8000-000000000002' and followed_id='95000000-0000-4000-8000-000000000001')) <> 0 then
    raise exception 'Blocking did not remove both follow edges';
  end if;
  begin
    insert into public.resa_follows(follower_id,followed_id)
    values (auth.uid(),'95000000-0000-4000-8000-000000000002');
    raise exception 'Blocked profile follow bypass succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_comments(content_id,author_id,body)
    values ('95000000-0000-4000-8000-000000000012',auth.uid(),'Should be blocked');
    raise exception 'Blocked profile comment bypass succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_reactions(content_id,user_id,reaction_type)
    values ('95000000-0000-4000-8000-000000000012',auth.uid(),'like');
    raise exception 'Blocked profile reaction bypass succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_shares(content_id,user_id,share_type)
    values ('95000000-0000-4000-8000-000000000012',auth.uid(),'repost');
    raise exception 'Blocked profile repost bypass succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
declare
  v_profile record;
begin
  if private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000001','message_policy') then
    raise exception 'Blocked member can still message the blocker';
  end if;
  if (select count(*) from public.resa_contents where id='95000000-0000-4000-8000-000000000011') <> 0 then
    raise exception 'Blocked member can still see blocker content';
  end if;
  if (select count(*) from public.resa_user_blocks) <> 0 then
    raise exception 'Blocked member can see another user block list';
  end if;
  select * into v_profile
  from public.resa_public_profile('95000000-0000-4000-8000-000000000001'::uuid);
  if not v_profile.private_locked or v_profile.display_name is not null then
    raise exception 'Blocked member can still discover the blocker profile';
  end if;
  if exists (select 1 from public.resa_profiles_for_ids(array['95000000-0000-4000-8000-000000000001'::uuid])) then
    raise exception 'Blocker still appears in profile hydration/search results for blocked member';
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
set role authenticated;
delete from public.resa_user_blocks
where blocker_id=auth.uid()
  and blocked_id='95000000-0000-4000-8000-000000000002';
do $test$
declare
  v_profile record;
begin
  if not private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','message_policy') then
    raise exception 'Unblocking did not restore the permitted contact policy';
  end if;
  select * into v_profile
  from public.resa_public_profile('95000000-0000-4000-8000-000000000002'::uuid);
  if v_profile.private_locked or v_profile.display_name <> 'Blocked' then
    raise exception 'Unblocking did not restore permitted public profile visibility';
  end if;
end;
$test$;
reset role;

rollback;
