\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('95000000-0000-4000-8000-000000000001','resa-block-a@example.test'),
 ('95000000-0000-4000-8000-000000000002','resa-block-b@example.test')
on conflict (id) do nothing;
insert into public.profiles(id,display_name,privacy) values
 ('95000000-0000-4000-8000-000000000001','Blocker', '{}'::jsonb),
 ('95000000-0000-4000-8000-000000000002','Blocked', '{}'::jsonb)
on conflict (id) do nothing;
insert into public.resa_contents(id,author_id,type,title,body,visibility)
values
 ('95000000-0000-4000-8000-000000000011','95000000-0000-4000-8000-000000000001','text','A post','From A','public'),
 ('95000000-0000-4000-8000-000000000012','95000000-0000-4000-8000-000000000002','text','B post','From B','public')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_user_blocks(blocker_id,blocked_id)
values ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002')
on conflict do nothing;

do $test$
begin
  if private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','message_policy') then
    raise exception 'Blocked profile still accepts direct messages';
  end if;
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
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
set role authenticated;
delete from public.resa_user_blocks
where blocker_id=auth.uid()
  and blocked_id='95000000-0000-4000-8000-000000000002';
do $test$
begin
  if not private.resa_contact_allowed(auth.uid(),'95000000-0000-4000-8000-000000000002','message_policy') then
    raise exception 'Unblocking did not restore the permitted contact policy';
  end if;
end;
$test$;
reset role;

rollback;
