\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','resa-event-author@example.test'),
 ('96000000-0000-4000-8000-000000000002','resa-event-follower@example.test'),
 ('96000000-0000-4000-8000-000000000003','resa-event-stranger@example.test'),
 ('96000000-0000-4000-8000-000000000004','resa-event-community@example.test'),
 ('96000000-0000-4000-8000-000000000005','resa-event-organization@example.test'),
 ('96000000-0000-4000-8000-000000000006','resa-event-invitee@example.test')
on conflict (id) do nothing;

insert into public.organizations(id,name,slug,created_by)
values ('98000000-0000-4000-8000-000000000001','RESA Event Test','resa-event-test-org','96000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.organization_memberships(organization_id,user_id,status)
values ('98000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000005','ACTIVE')
on conflict do nothing;

insert into public.resa_follows(follower_id,followed_id)
values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.resa_communities(id,created_by,name,slug,visibility,status)
values
 ('97000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001','Private Event Community','resa-private-event-community','private','active'),
 ('97000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001','Public Event Community','resa-public-event-community','public','active')
on conflict (id) do nothing;

insert into public.resa_community_members(community_id,user_id,role,status)
values ('97000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000004','member','active')
on conflict do nothing;

insert into public.resa_events(id,created_by,title,starts_at,visibility,community_id,organization_id)
values
 ('99000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001','Public event',now()+interval '2 days','public',null,null),
 ('99000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001','Followers event',now()+interval '2 days','followers',null,null),
 ('99000000-0000-4000-8000-000000000003','96000000-0000-4000-8000-000000000001','Community event',now()+interval '2 days','community','97000000-0000-4000-8000-000000000001',null),
 ('99000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000001','Organization event',now()+interval '2 days','organization',null,'98000000-0000-4000-8000-000000000001'),
 ('99000000-0000-4000-8000-000000000005','96000000-0000-4000-8000-000000000001','Private event',now()+interval '2 days','private',null,null)
on conflict (id) do nothing;

insert into public.resa_event_participants(event_id,user_id,response)
values ('99000000-0000-4000-8000-000000000005','96000000-0000-4000-8000-000000000006','going')
on conflict do nothing;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Follower cannot read public event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000002') <> 1 then raise exception 'Follower cannot read followers event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000003') <> 0 then raise exception 'Follower can read community event without membership'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000004') <> 0 then raise exception 'Follower can read organization event without membership'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000005') <> 0 then raise exception 'Follower can read private event'; end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000004',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000003') <> 1 then raise exception 'Community member cannot read community event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Community member can read followers event without following'; end if;
end;
$test$;
do $test$
begin
  insert into public.resa_events(id,created_by,title,starts_at,visibility,community_id)
  values ('99100000-0000-4000-8000-000000000001',auth.uid(),'Community member event',now()+interval '3 days','community','97000000-0000-4000-8000-000000000001');
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000005',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000004') <> 1 then raise exception 'Organization member cannot read organization event'; end if;
end;
$test$;
do $test$
begin
  insert into public.resa_events(id,created_by,title,starts_at,visibility,organization_id)
  values ('99100000-0000-4000-8000-000000000002',auth.uid(),'Organization member event',now()+interval '3 days','organization','98000000-0000-4000-8000-000000000001');
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000003',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Stranger cannot read public event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Stranger can read followers event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000003') <> 0 then raise exception 'Stranger can read community event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000004') <> 0 then raise exception 'Stranger can read organization event'; end if;
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000005') <> 0 then raise exception 'Stranger can read private event'; end if;
end;
$test$;
do $test$
begin
  begin
    insert into public.resa_event_participants(event_id,user_id,response)
    values ('99000000-0000-4000-8000-000000000005',auth.uid(),'going');
    raise exception 'Stranger joined private event by guessing its ID';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.resa_community_members(community_id,user_id,role,status)
    values ('97000000-0000-4000-8000-000000000001',auth.uid(),'member','active');
    raise exception 'Stranger self-joined a private community';
  exception when insufficient_privilege then null;
  end;
  insert into public.resa_community_members(community_id,user_id,role,status)
  values ('97000000-0000-4000-8000-000000000002',auth.uid(),'member','active');
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000006',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_events where id='99000000-0000-4000-8000-000000000005') <> 1 then
    raise exception 'Invited participant cannot read private event';
  end if;
end;
$test$;
reset role;

rollback;
