\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','mute-a@example.test'),
 ('96000000-0000-4000-8000-000000000002','mute-b@example.test')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set role authenticated;
insert into public.resa_user_mutes(muter_id,muted_id)
values ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002');

do $test$
begin
  if (select count(*) from public.resa_user_mutes where muter_id=auth.uid()) <> 1 then
    raise exception 'Viewer cannot read their own mute list';
  end if;
  begin
    insert into public.resa_user_mutes(muter_id,muted_id)
    values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001');
    raise exception 'Cross-account mute insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_user_mutes(muter_id,muted_id)
    values (auth.uid(),auth.uid());
    raise exception 'Self-mute unexpectedly succeeded';
  exception when check_violation then null;
  end;
end;
$test$;
reset role;

-- Notification trigger suppresses social activity from a muted account only.
insert into public.notifications(user_id,type,title,data)
values
 ('96000000-0000-4000-8000-000000000001','resa.comment','Muted actor',jsonb_build_object('actor_id','96000000-0000-4000-8000-000000000002')),
 ('96000000-0000-4000-8000-000000000001','resa.comment','Unmuted actor',jsonb_build_object('actor_id','96000000-0000-4000-8000-000000000001')),
 ('96000000-0000-4000-8000-000000000001','system.notice','System notice','{}'::jsonb);

do $test$
begin
  if exists (select 1 from public.notifications where title='Muted actor') then
    raise exception 'Notification from muted account was not suppressed';
  end if;
  if not exists (select 1 from public.notifications where title='Unmuted actor') then
    raise exception 'Notification from unmuted account was incorrectly suppressed';
  end if;
  if not exists (select 1 from public.notifications where title='System notice') then
    raise exception 'Non-social notification was incorrectly suppressed';
  end if;
end;
$test$;

rollback;
