\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('94000000-0000-4000-8000-000000000001','resa-metrics-owner@example.test'),
 ('94000000-0000-4000-8000-000000000002','resa-metrics-member-b@example.test'),
 ('94000000-0000-4000-8000-000000000003','resa-metrics-member-c@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('94000000-0000-4000-8000-000000000001','Metrics Owner','{"profile_visibility":"public"}'::jsonb),
 ('94000000-0000-4000-8000-000000000002','Metrics Member B','{"profile_visibility":"public"}'::jsonb),
 ('94000000-0000-4000-8000-000000000003','Metrics Member C','{"profile_visibility":"public"}'::jsonb)
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility)
values ('94000000-0000-4000-8000-000000000011','94000000-0000-4000-8000-000000000001','text','Metrics post','Aggregate interactions only','public')
on conflict (id) do nothing;

do $privileges$
begin
  if has_function_privilege('anon','public.resa_content_engagement_counts(uuid[])','execute') then
    raise exception 'Anonymous role can execute the engagement aggregate RPC';
  end if;
  if has_function_privilege('anon','private.resa_content_engagement_counts(uuid[])','execute') then
    raise exception 'Anonymous role can execute the private engagement aggregate function';
  end if;
end;
$privileges$;

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',false);
set role authenticated;
insert into public.resa_reactions(content_id,user_id,reaction_type)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'like');
insert into public.resa_comments(content_id,author_id,body)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'Member B comment');
insert into public.resa_shares(content_id,user_id,share_type)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'repost');
reset role;

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000003',false);
set role authenticated;
insert into public.resa_reactions(content_id,user_id,reaction_type)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'like');
insert into public.resa_comments(content_id,author_id,body)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'Member C comment');
insert into public.resa_shares(content_id,user_id,share_type)
values ('94000000-0000-4000-8000-000000000011',auth.uid(),'repost');
reset role;

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $test$
declare
  v_metrics record;
begin
  select * into v_metrics
  from public.resa_content_engagement_counts(array['94000000-0000-4000-8000-000000000011'::uuid]);

  if v_metrics.content_id is null then
    raise exception 'Visible publication engagement aggregate was not returned';
  end if;
  if v_metrics.reaction_count <> 2 or v_metrics.comment_count <> 2 or v_metrics.share_count <> 2 then
    raise exception 'Engagement aggregate counts are incorrect: reactions %, comments %, shares %',
      v_metrics.reaction_count, v_metrics.comment_count, v_metrics.share_count;
  end if;
end;
$test$;
reset role;

-- A member blocked by the author must not receive even aggregate metrics for
-- that author's content.
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',false);
set role authenticated;
insert into public.resa_user_blocks(blocker_id,blocked_id)
values (auth.uid(),'94000000-0000-4000-8000-000000000001');
do $blocked$
begin
  if exists (
    select 1 from public.resa_content_engagement_counts(array['94000000-0000-4000-8000-000000000011'::uuid])
  ) then
    raise exception 'Blocked viewer received engagement aggregates for blocked author's content';
  end if;
end;
$blocked$;
reset role;

rollback;
