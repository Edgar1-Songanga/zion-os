\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
 ('97000000-0000-4000-8000-000000000001','follow-requester@example.test'),
 ('97000000-0000-4000-8000-000000000002','follow-owner@example.test'),
 ('97000000-0000-4000-8000-000000000003','follow-cancel-requester@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('97000000-0000-4000-8000-000000000001','Follow Requester','{}'),
 ('97000000-0000-4000-8000-000000000002','Private Follow Owner','{"profile_visibility":"private","follow_policy":"auto"}'),
 ('97000000-0000-4000-8000-000000000003','Cancel Requester','{}')
on conflict (id) do update set privacy=excluded.privacy;

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);

do $test$
declare
  v_request jsonb;
  v_request_id uuid;
  v_count integer;
begin
  v_request := public.resa_create_follow_request('97000000-0000-4000-8000-000000000002');
  v_request_id := (v_request->>'id')::uuid;
  if v_request->>'status' <> 'pending' then
    raise exception 'New private follow request must be pending';
  end if;

  -- Duplicate taps are idempotent and do not create a second request.
  v_request := public.resa_create_follow_request('97000000-0000-4000-8000-000000000002');
  if (v_request->>'id')::uuid <> v_request_id then
    raise exception 'Duplicate request created a second row';
  end if;
  select count(*) into v_count from public.resa_follow_requests
  where requester_id = auth.uid() and target_id = '97000000-0000-4000-8000-000000000002';
  if v_count <> 1 then raise exception 'Expected exactly one pending request'; end if;

  -- A pending request is not a follow and cannot be converted by a direct edge write.
  begin
    insert into public.resa_follows(follower_id,followed_id)
    values (auth.uid(),'97000000-0000-4000-8000-000000000002');
    raise exception 'Pending request bypassed follow approval';
  exception when insufficient_privilege then
    null;
  end;

  -- Only the profile owner can approve; approval and follow edge are atomic.
  perform set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000003',true);
  begin
    perform public.resa_decide_follow_request(v_request_id,'accept');
    raise exception 'Unrelated account approved a follow request';
  exception when no_data_found then
    null;
  end;

  perform set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
  perform public.resa_decide_follow_request(v_request_id,'accept');
  if not exists (
    select 1 from public.resa_follows
    where follower_id = '97000000-0000-4000-8000-000000000001'
      and followed_id = '97000000-0000-4000-8000-000000000002'
  ) then raise exception 'Accepted request did not create follow edge'; end if;
  if not exists (
    select 1 from public.resa_follow_requests where id = v_request_id and status = 'accepted'
  ) then raise exception 'Accepted request status was not persisted'; end if;

  -- A second requester can cancel their own pending request.
  perform set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000003',true);
  v_request := public.resa_create_follow_request('97000000-0000-4000-8000-000000000002');
  if not public.resa_cancel_follow_request('97000000-0000-4000-8000-000000000002') then
    raise exception 'Requester could not cancel their pending request';
  end if;
  if exists (
    select 1 from public.resa_follow_requests
    where requester_id = auth.uid() and target_id = '97000000-0000-4000-8000-000000000002'
  ) then raise exception 'Cancelled request still exists'; end if;
end;
$test$;

rollback;
