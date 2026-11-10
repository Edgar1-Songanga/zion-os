\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('97000000-0000-4000-8000-000000000001','creator-a@example.test'),
 ('97000000-0000-4000-8000-000000000002','creator-b@example.test'),
 ('97000000-0000-4000-8000-000000000011','viewer-1@example.test'),
 ('97000000-0000-4000-8000-000000000012','viewer-2@example.test'),
 ('97000000-0000-4000-8000-000000000013','viewer-3@example.test'),
 ('97000000-0000-4000-8000-000000000014','viewer-4@example.test'),
 ('97000000-0000-4000-8000-000000000015','viewer-5@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('97000000-0000-4000-8000-000000000001','Creator A','{}'::jsonb),
 ('97000000-0000-4000-8000-000000000002','Creator B','{}'::jsonb)
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility,moderation_status)
values
 ('97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000001','video','Public active','Public active content','public','active'),
 ('97000000-0000-4000-8000-000000000102','97000000-0000-4000-8000-000000000001','video','Private audience','Followers only','followers','active'),
 ('97000000-0000-4000-8000-000000000103','97000000-0000-4000-8000-000000000001','video','Removed','Moderated content','public','removed'),
 ('97000000-0000-4000-8000-000000000104','97000000-0000-4000-8000-000000000002','video','Other creator','Other creator content','public','active')
on conflict (id) do nothing;

-- One daily public bucket with five distinct viewers and seven total views.
insert into public.resa_feed_impressions(user_id,content_id,viewed_on,duration_ms,view_count,completed_count)
values
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000101','2026-11-09',20000,1,1),
 ('97000000-0000-4000-8000-000000000012','97000000-0000-4000-8000-000000000101','2026-11-09',30000,2,1),
 ('97000000-0000-4000-8000-000000000013','97000000-0000-4000-8000-000000000101','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000014','97000000-0000-4000-8000-000000000101','2026-11-09',15000,1,0),
 ('97000000-0000-4000-8000-000000000015','97000000-0000-4000-8000-000000000101','2026-11-09',25000,2,0),
 -- Four viewers must be suppressed by the k-anonymity threshold.
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000101','2026-11-08',10000,1,0),
 ('97000000-0000-4000-8000-000000000012','97000000-0000-4000-8000-000000000101','2026-11-08',10000,1,0),
 ('97000000-0000-4000-8000-000000000013','97000000-0000-4000-8000-000000000101','2026-11-08',10000,1,0),
 ('97000000-0000-4000-8000-000000000014','97000000-0000-4000-8000-000000000101','2026-11-08',10000,1,0),
 -- Private, moderated and other-creator content must never enter Creator A's metrics.
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000102','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000012','97000000-0000-4000-8000-000000000102','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000013','97000000-0000-4000-8000-000000000102','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000014','97000000-0000-4000-8000-000000000102','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000015','97000000-0000-4000-8000-000000000102','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000103','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000012','97000000-0000-4000-8000-000000000103','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000013','97000000-0000-4000-8000-000000000103','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000014','97000000-0000-4000-8000-000000000103','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000015','97000000-0000-4000-8000-000000000103','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000104','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000012','97000000-0000-4000-8000-000000000104','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000013','97000000-0000-4000-8000-000000000104','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000014','97000000-0000-4000-8000-000000000104','2026-11-09',10000,1,0),
 ('97000000-0000-4000-8000-000000000015','97000000-0000-4000-8000-000000000104','2026-11-09',10000,1,0)
on conflict (user_id,content_id,viewed_on) do update
set duration_ms=excluded.duration_ms,view_count=excluded.view_count,completed_count=excluded.completed_count;

select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',false);
set role authenticated;

do $test$
declare
  v_row record;
  v_count integer;
begin
  select count(*) into v_count
  from public.resa_creator_analytics('2026-11-08'::date,'2026-11-09'::date);
  if v_count <> 1 then
    raise exception 'Expected exactly one threshold-safe public daily bucket, got %', v_count;
  end if;

  select * into v_row
  from public.resa_creator_analytics('2026-11-08'::date,'2026-11-09'::date);
  if v_row.metric_date <> '2026-11-09'::date
    or v_row.unique_viewers <> 5
    or v_row.views <> 7
    or v_row.completed_views <> 2
    or v_row.watch_seconds <> 100 then
    raise exception 'Creator aggregate mismatch: %', row_to_json(v_row);
  end if;

  begin
    perform * from public.resa_creator_analytics('2026-01-01'::date,'2026-04-01'::date);
    raise exception 'Analytics accepted a period longer than 90 days';
  exception when invalid_parameter_value then null;
  end;
end;
$test$;

reset role;
select set_config('request.jwt.claim.sub','',false);
set role authenticated;
do $test$
begin
  begin
    perform * from public.resa_creator_analytics('2026-11-09'::date,'2026-11-09'::date);
    raise exception 'Unauthenticated analytics request succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

rollback;
