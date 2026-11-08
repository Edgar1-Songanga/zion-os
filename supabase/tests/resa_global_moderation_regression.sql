\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('98000000-0000-4000-8000-000000000001','global-moderator@example.test'),
 ('98000000-0000-4000-8000-000000000002','reporter@example.test'),
 ('98000000-0000-4000-8000-000000000003','content-author@example.test'),
 ('98000000-0000-4000-8000-000000000004','unrelated-member@example.test')
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility)
values ('98000000-0000-4000-8000-000000000010','98000000-0000-4000-8000-000000000003','text','Reported post','Example content','public')
on conflict (id) do nothing;

insert into public.resa_moderation_reports(id,reporter_id,content_id,reason,status,organization_id)
values ('98000000-0000-4000-8000-000000000020','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000010','spam','open',null)
on conflict (id) do nothing;

-- Verified global moderators can read and decide platform-wide reports.
select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000001',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_moderation_reports where id='98000000-0000-4000-8000-000000000020') <> 1 then
    raise exception 'Verified global moderator cannot read platform-wide report';
  end if;
  update public.resa_moderation_reports
    set status='resolved', reviewed_by=auth.uid(), reviewed_at=now(), review_note='Reviewed by platform moderation'
    where id='98000000-0000-4000-8000-000000000020';
  if not exists (
    select 1 from public.resa_moderation_reports
    where id='98000000-0000-4000-8000-000000000020'
      and status='resolved'
      and reviewed_by=auth.uid()
      and review_note='Reviewed by platform moderation'
  ) then
    raise exception 'Verified global moderator cannot update platform-wide report';
  end if;
end;
$test$;
reset role;

-- The original reporter retains read access to their own report.
select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000002',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_moderation_reports where id='98000000-0000-4000-8000-000000000020') <> 1 then
    raise exception 'Reporter lost access to their own report';
  end if;
end;
$test$;
reset role;

-- An unrelated member cannot read or change another member's report.
select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000004',false);
set role authenticated;
do $test$
begin
  if exists (select 1 from public.resa_moderation_reports where id='98000000-0000-4000-8000-000000000020') then
    raise exception 'Unrelated member can read another member report';
  end if;
  update public.resa_moderation_reports set status='dismissed'
    where id='98000000-0000-4000-8000-000000000020';
  if exists (select 1 from public.resa_moderation_reports where id='98000000-0000-4000-8000-000000000020' and status='dismissed') then
    raise exception 'Unrelated member can change moderation report';
  end if;
end;
$test$;
reset role;

rollback;
