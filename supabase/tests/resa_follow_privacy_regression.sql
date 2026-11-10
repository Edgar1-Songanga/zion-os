\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','resa-follow-actor@example.test'),
 ('96000000-0000-4000-8000-000000000002','resa-follow-public@example.test'),
 ('96000000-0000-4000-8000-000000000003','resa-follow-private@example.test'),
 ('96000000-0000-4000-8000-000000000004','resa-follow-disabled@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('96000000-0000-4000-8000-000000000001','Follow actor','{"profile_visibility":"public","follow_policy":"auto"}'::jsonb),
 ('96000000-0000-4000-8000-000000000002','Public profile','{"profile_visibility":"public","follow_policy":"auto"}'::jsonb),
 ('96000000-0000-4000-8000-000000000003','Private profile','{"profile_visibility":"private","follow_policy":"auto"}'::jsonb),
 ('96000000-0000-4000-8000-000000000004','Disabled profile','{"profile_visibility":"public","follow_policy":"none"}'::jsonb)
on conflict (id) do update set privacy = excluded.privacy;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set role authenticated;

-- Public profiles with automatic follows remain followable.
insert into public.resa_follows(follower_id,followed_id)
values (auth.uid(),'96000000-0000-4000-8000-000000000002');

do $test$
begin
  begin
    insert into public.resa_follows(follower_id,followed_id)
    values (auth.uid(),'96000000-0000-4000-8000-000000000003');
    raise exception 'Private profile accepted an automatic follow';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.resa_follows(follower_id,followed_id)
    values (auth.uid(),'96000000-0000-4000-8000-000000000004');
    raise exception 'Profile with follow_policy=none accepted a follow';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.resa_follows(follower_id,followed_id)
    values ('96000000-0000-4000-8000-000000000002',auth.uid());
    raise exception 'Caller forged another member as the follower';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

reset role;
rollback;
