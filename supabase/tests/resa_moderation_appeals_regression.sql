\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('98100000-0000-4000-8000-000000000001','appeal-reviewer@example.test'),
 ('98100000-0000-4000-8000-000000000002','appeal-reporter@example.test'),
 ('98100000-0000-4000-8000-000000000003','original-moderator@example.test'),
 ('98100000-0000-4000-8000-000000000004','unrelated-appeal-member@example.test')
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility)
values ('98100000-0000-4000-8000-000000000010','98100000-0000-4000-8000-000000000004','text','Appeal fixture','Test content','public')
on conflict (id) do nothing;

insert into public.resa_moderation_reports(id,reporter_id,content_id,reason,status,reviewed_by,reviewed_at,review_note,organization_id)
values ('98100000-0000-4000-8000-000000000020','98100000-0000-4000-8000-000000000002','98100000-0000-4000-8000-000000000010','spam','dismissed','98100000-0000-4000-8000-000000000003',now(),'Original decision',null)
on conflict (id) do update set status='dismissed', reviewed_by='98100000-0000-4000-8000-000000000003';

-- Only the original reporter can submit one appeal for a final decision.
select set_config('request.jwt.claim.sub','98100000-0000-4000-8000-000000000002',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
insert into public.resa_moderation_appeals(report_id,appellant_id,reason,details)
values ('98100000-0000-4000-8000-000000000020','98100000-0000-4000-8000-000000000002','A decisão não considerou a informação adicional.','Peço que a evidência anexada seja revista.');
do $test$
begin
  if (select count(*) from public.resa_moderation_appeals where report_id='98100000-0000-4000-8000-000000000020') <> 1 then
    raise exception 'Reporter cannot read their own appeal';
  end if;
end;
$test$;
reset role;

-- A different verified moderator can decide; the original reviewer cannot.
select set_config('request.jwt.claim.sub','98100000-0000-4000-8000-000000000001',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
declare v_appeal uuid;
begin
  select id into v_appeal from public.resa_moderation_appeals
    where report_id='98100000-0000-4000-8000-000000000020';
  update public.resa_moderation_appeals
    set status='overturned', reviewed_by=auth.uid(), reviewed_at=now(),
        decision_note='A reapreciação confirmou que a denúncia deve ser acolhida.'
    where id=v_appeal;
  if not exists (select 1 from public.resa_moderation_appeals where id=v_appeal and status='overturned' and reviewed_by=auth.uid()) then
    raise exception 'Second moderator could not decide the appeal';
  end if;
end;
$test$;
reset role;

-- Unrelated accounts cannot read the appeal.
select set_config('request.jwt.claim.sub','98100000-0000-4000-8000-000000000004',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
begin
  if exists (select 1 from public.resa_moderation_appeals where report_id='98100000-0000-4000-8000-000000000020') then
    raise exception 'Unrelated member can read an appeal';
  end if;
end;
$test$;
reset role;

rollback;
