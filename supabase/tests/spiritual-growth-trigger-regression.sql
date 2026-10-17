-- Regression tests for migration 20261017170000_fix_spiritual_growth_partial_conflict_target.sql.
-- Run only against the ephemeral PostgreSQL service created by GitHub Actions.
\set ON_ERROR_STOP on
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_prayer uuid := gen_random_uuid();
  v_devotion uuid := gen_random_uuid();
  v_count integer;
begin
  -- A normal prayer insert must commit and emit exactly one growth event.
  insert into public.resa_prayer_requests(id, author_id, visibility)
  values (v_prayer, v_user, 'private');

  select count(*) into v_count
  from public.spiritual_growth_events
  where user_id = v_user and source = 'prayer_request_created'
    and metadata ->> 'entity_id' = v_prayer::text;
  if v_count <> 1 then
    raise exception 'Expected one prayer-created growth event, got %', v_count;
  end if;

  -- Marking a prayer answered must create the answered event without breaking the update.
  update public.resa_prayer_requests
  set status = 'answered', answered_at = now()
  where id = v_prayer;

  select count(*) into v_count
  from public.spiritual_growth_events
  where user_id = v_user and source = 'prayer_request_answered'
    and metadata ->> 'entity_id' = v_prayer::text;
  if v_count <> 1 then
    raise exception 'Expected one prayer-answered growth event, got %', v_count;
  end if;

  -- Devotion inserts must also work with the same partial unique index.
  insert into public.spiritual_devotions(id, user_id, completed_at, title)
  values (v_devotion, v_user, now(), 'CI regression test');

  select count(*) into v_count
  from public.spiritual_growth_events
  where user_id = v_user and source = 'devotion_completed'
    and metadata ->> 'entity_id' = v_devotion::text;
  if v_count <> 1 then
    raise exception 'Expected one devotion growth event, got %', v_count;
  end if;

  -- Seed the unique event first, then insert the source row. The trigger must be idempotent.
  v_prayer := gen_random_uuid();
  insert into public.spiritual_growth_events(user_id, area, source, occurred_at, metadata)
  values (v_user, 'prayer', 'prayer_request_created', now(),
          jsonb_build_object('entity_id', v_prayer::text));
  insert into public.resa_prayer_requests(id, author_id, visibility)
  values (v_prayer, v_user, 'private');

  select count(*) into v_count
  from public.spiritual_growth_events
  where user_id = v_user and source = 'prayer_request_created'
    and metadata ->> 'entity_id' = v_prayer::text;
  if v_count <> 1 then
    raise exception 'Expected idempotent conflict handling, got % events', v_count;
  end if;
end;
$$;

rollback;
