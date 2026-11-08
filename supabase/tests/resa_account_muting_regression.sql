\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','mute-owner@example.test'),
 ('96000000-0000-4000-8000-000000000002','mute-target@example.test'),
 ('96000000-0000-4000-8000-000000000003','other-owner@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name) values
 ('96000000-0000-4000-8000-000000000001','Mute owner'),
 ('96000000-0000-4000-8000-000000000002','Muted member'),
 ('96000000-0000-4000-8000-000000000003','Other owner')
on conflict (id) do nothing;

insert into public.resa_follows(follower_id,followed_id)
values ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002')
on conflict do nothing;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set role authenticated;

insert into public.resa_user_mutes(muter_id,muted_id)
values (auth.uid(),'96000000-0000-4000-8000-000000000002');

do $test$
begin
  if (select count(*) from public.resa_user_mutes) <> 1 then
    raise exception 'Viewer cannot read their own mute';
  end if;
  if not exists (
    select 1 from public.resa_follows
    where follower_id=auth.uid()
      and followed_id='96000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Muting unexpectedly removed the follow relationship';
  end if;
  begin
    insert into public.resa_user_mutes(muter_id,muted_id)
    values (auth.uid(),auth.uid());
    raise exception 'Self-mute unexpectedly succeeded';
  exception when check_violation then null;
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000003',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_user_mutes) <> 0 then
    raise exception 'Another account can read the viewer mute list';
  end if;
  begin
    insert into public.resa_user_mutes(muter_id,muted_id)
    values ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002');
    raise exception 'Another account can create a mute on behalf of the viewer';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set role authenticated;
delete from public.resa_user_mutes
where muter_id=auth.uid()
  and muted_id='96000000-0000-4000-8000-000000000002';
do $test$
begin
  if exists (select 1 from public.resa_user_mutes where muter_id=auth.uid()) then
    raise exception 'Unmute did not remove the viewer-owned record';
  end if;
  if not exists (
    select 1 from public.resa_follows
    where follower_id=auth.uid()
      and followed_id='96000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Unmuting changed the follow relationship';
  end if;
end;
$test$;
reset role;

rollback;
