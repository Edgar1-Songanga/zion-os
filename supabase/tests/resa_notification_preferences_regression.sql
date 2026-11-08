\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('97000000-0000-4000-8000-000000000001','notify-a@example.test'),
 ('97000000-0000-4000-8000-000000000002','notify-b@example.test')
on conflict (id) do nothing;

insert into public.notification_preferences(user_id,enabled,channels,muted_types,quiet_start,quiet_end,sound_enabled,vibration_enabled)
values
 ('97000000-0000-4000-8000-000000000001',false,array['in_app']::text[],'{}'::text[],null,null,false,false),
 ('97000000-0000-4000-8000-000000000002',true,array['in_app']::text[],array['resa.comment']::text[],null,null,true,true)
on conflict (user_id) do update set
 enabled=excluded.enabled, channels=excluded.channels, muted_types=excluded.muted_types,
 quiet_start=excluded.quiet_start, quiet_end=excluded.quiet_end,
 sound_enabled=excluded.sound_enabled, vibration_enabled=excluded.vibration_enabled;

insert into public.notifications(user_id,type,title,body,channel,priority,data)
values
 ('97000000-0000-4000-8000-000000000001','resa.follow','Disabled account','Should be dropped','in_app','normal','{}'::jsonb),
 ('97000000-0000-4000-8000-000000000002','resa.comment','Muted comment','Should be dropped','in_app','normal','{}'::jsonb),
 ('97000000-0000-4000-8000-000000000002','resa.reaction','Allowed reaction','Should remain','in_app','normal','{}'::jsonb);

do $test$
begin
  if exists (select 1 from public.notifications where user_id='97000000-0000-4000-8000-000000000001') then
    raise exception 'Global notification disable did not suppress new notifications';
  end if;
  if exists (select 1 from public.notifications where user_id='97000000-0000-4000-8000-000000000002' and type='resa.comment') then
    raise exception 'Muted notification type was not suppressed';
  end if;
  if not exists (select 1 from public.notifications where user_id='97000000-0000-4000-8000-000000000002' and type='resa.reaction') then
    raise exception 'Allowed notification type was incorrectly suppressed';
  end if;
  if not (select sound_enabled and vibration_enabled from public.notification_preferences where user_id='97000000-0000-4000-8000-000000000002') then
    raise exception 'Sound and vibration preferences were not persisted';
  end if;
end;
$test$;

rollback;
