\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000001','story-author@example.test'),
 ('96000000-0000-4000-8000-000000000002','story-viewer@example.test'),
 ('96000000-0000-4000-8000-000000000003','story-stranger@example.test')
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,body,visibility,created_at)
values
 ('96100000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001','story','Public active story','public',now()),
 ('96100000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001','story','Expired story','public',now()-interval '25 hours'),
 ('96100000-0000-4000-8000-000000000003','96000000-0000-4000-8000-000000000001','story','Followers story','followers',now())
on conflict (id) do nothing;

insert into public.resa_follows(follower_id,followed_id)
values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- A follower can record exactly one view for an active story. Reopening the
-- same story does not inflate its unique-viewer count.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $test$
begin
  if not public.resa_record_story_view('96100000-0000-4000-8000-000000000001') then
    raise exception 'First active story view was not recorded';
  end if;
  if public.resa_record_story_view('96100000-0000-4000-8000-000000000001') then
    raise exception 'Repeated story view was not deduplicated';
  end if;
  if public.resa_record_story_view('96100000-0000-4000-8000-000000000002') then
    raise exception 'Expired story view was accepted';
  end if;
  if not public.resa_record_story_view('96100000-0000-4000-8000-000000000003') then
    raise exception 'Authorized follower could not view followers-only story';
  end if;
  if (select count(*) from public.resa_story_views where story_id='96100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Viewer can inspect another user story-view rows';
  end if;
  if public.resa_story_view_count('96100000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'Non-author can inspect story-view count';
  end if;
  if has_table_privilege('authenticated','public.resa_story_views','INSERT') then
    raise exception 'Authenticated users can bypass the guarded view-recording RPC';
  end if;
end;
$test$;
reset role;

-- The author alone can read viewer identities and exact totals.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $test$
begin
  if (select count(*) from public.resa_story_views where story_id='96100000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Story author cannot read the viewer list';
  end if;
  if public.resa_story_view_count('96100000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Story author cannot read the exact unique-viewer count';
  end if;
  if exists (
    select 1 from public.resa_story_views
    where story_id='96100000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Expired story unexpectedly has a view';
  end if;
end;
$test$;
reset role;

-- Blocking in either direction prevents a new view.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',false);
set role authenticated;
insert into public.resa_user_blocks(blocker_id,blocked_id)
values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001')
on conflict do nothing;
do $test$
begin
  if public.resa_record_story_view('96100000-0000-4000-8000-000000000001') then
    raise exception 'Blocked viewer was allowed to record a story view';
  end if;
end;
$test$;
reset role;

rollback;

select 'RESA story view privacy and deduplication regression passed' as result;
