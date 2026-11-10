\set ON_ERROR_STOP on
begin;

insert into auth.users(id, email) values
  ('97000000-0000-4000-8000-000000000001', 'live-host@example.test'),
  ('97000000-0000-4000-8000-000000000002', 'live-member@example.test'),
  ('97000000-0000-4000-8000-000000000003', 'live-moderator@example.test'),
  ('97000000-0000-4000-8000-000000000004', 'live-outsider@example.test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', true);

insert into public.resa_live_sessions(id, host_id, visibility, status)
values ('97100000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', 'public', 'live');

insert into public.resa_live_moderators(live_id, moderator_user_id, granted_by)
values ('97100000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000003', '97000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000002', true);

insert into public.resa_live_hand_raises(live_id, user_id)
values ('97100000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000002');

do $test$
begin
  if (select count(*) from public.resa_live_hand_raises where status = 'WAITING') <> 1 then
    raise exception 'Participant must be able to read their own pending request';
  end if;
end
$test$;

-- A participant cannot read another member's pending request.
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000004', true);
do $test$
begin
  if (select count(*) from public.resa_live_hand_raises) <> 0 then
    raise exception 'An unrelated viewer can read another participant hand raise';
  end if;
end
$test$;

-- The host can see and approve the pending request.
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', true);
do $test$
declare v_request_id uuid;
begin
  select id into v_request_id from public.resa_live_hand_raises where status = 'WAITING';
  if v_request_id is null then raise exception 'Host cannot see the pending request'; end if;
  update public.resa_live_hand_raises
    set status = 'APPROVED', resolved_at = now(), resolved_by = auth.uid()
    where id = v_request_id;
  if not exists (select 1 from public.resa_live_hand_raises where id = v_request_id and status = 'APPROVED') then
    raise exception 'Host could not approve the pending request';
  end if;
end
$test$;

-- Participant can withdraw their own pending request.
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000002', true);
insert into public.resa_live_hand_raises(live_id, user_id)
values ('97100000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000002');
update public.resa_live_hand_raises
  set status = 'WITHDRAWN'
  where live_id = '97100000-0000-4000-8000-000000000001'
    and user_id = auth.uid() and status = 'WAITING';
do $test$
begin
  if not exists (
    select 1 from public.resa_live_hand_raises
    where user_id = auth.uid() and status = 'WITHDRAWN'
  ) then raise exception 'Participant could not withdraw their own request'; end if;
end
$test$;

-- A moderator can see and decline a pending request.
insert into public.resa_live_hand_raises(live_id, user_id)
values ('97100000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000003', true);
do $test$
declare v_request_id uuid;
begin
  select id into v_request_id from public.resa_live_hand_raises where status = 'WAITING';
  if v_request_id is null then raise exception 'Moderator cannot see the pending request'; end if;
  update public.resa_live_hand_raises
    set status = 'DECLINED', resolved_at = now(), resolved_by = auth.uid()
    where id = v_request_id;
  if not exists (select 1 from public.resa_live_hand_raises where id = v_request_id and status = 'DECLINED') then
    raise exception 'Moderator could not decline the pending request';
  end if;
end
$test$;

rollback;
