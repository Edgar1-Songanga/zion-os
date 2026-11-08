\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000001','resa-audience-author@example.test'),
 ('91000000-0000-4000-8000-000000000002','resa-audience-follower@example.test'),
 ('91000000-0000-4000-8000-000000000003','resa-audience-stranger@example.test'),
 ('91000000-0000-4000-8000-000000000004','resa-audience-community@example.test'),
 ('91000000-0000-4000-8000-000000000005','resa-audience-organization@example.test')
on conflict (id) do nothing;

insert into public.resa_follows(follower_id,followed_id)
values ('91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.resa_communities(id,created_by,name,slug,visibility,status)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Audience Test','resa-audience-test','private','active')
on conflict (id) do nothing;

insert into public.resa_community_members(community_id,user_id,role,status)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','member','active')
on conflict do nothing;

insert into public.organizations(id,name,slug,created_by)
values ('94000000-0000-4000-8000-000000000001','RESA Audience Test','resa-audience-test-org','91000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.organization_memberships(organization_id,user_id,status)
values ('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000005','ACTIVE')
on conflict do nothing;


insert into public.resa_contents(id,author_id,type,body,visibility,community_id)
values
 ('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','text','Public content','public',null),
 ('93000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','text','Followers content','followers',null),
 ('93000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000001','text','Community content','community','92000000-0000-4000-8000-000000000001'),
 ('93000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000001','text','Private content','private',null),
 ('93000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000001','text','Organization content','organization',null)
on conflict (id) do nothing;

update public.resa_contents
set organization_id = '94000000-0000-4000-8000-000000000001'
where id = '93000000-0000-4000-8000-000000000005';

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Follower could not read public content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'Follower could not read followers-only content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000003') <> 0 then
    raise exception 'Non-member could read community content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000004') <> 0 then
    raise exception 'Follower could read private content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000005') <> 0 then
    raise exception 'Non-member could read organization content';
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000003') <> 1 then
    raise exception 'Active community member could not read community content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'Non-follower could read followers-only content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000005') <> 0 then
    raise exception 'Community member could read organization content';
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'Stranger could read followers-only content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000003') <> 0 then
    raise exception 'Stranger could read community content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000004') <> 0 then
    raise exception 'Stranger could read private content';
  end if;
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000005') <> 0 then
    raise exception 'Stranger could read organization content';
  end if;
end;
$test$;
reset role;


select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000005',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000005') <> 1 then
    raise exception 'Active organization member could not read organization content';
  end if;
end;
$test$;
reset role;


select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000005',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_contents where id='93000000-0000-4000-8000-000000000005') <> 1 then
    raise exception 'Active organization member could not read organization content';
  end if;
end;
$test$;
reset role;

rollback;
