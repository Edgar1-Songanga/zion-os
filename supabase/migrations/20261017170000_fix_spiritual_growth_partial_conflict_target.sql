-- Repair partial-index inference for transactional spiritual-growth triggers.
-- The unique index spiritual_growth_events_entity_source_uidx is partial:
-- WHERE metadata ? 'entity_id'. Every ON CONFLICT target must include the same
-- predicate or PostgreSQL raises 42P10 and rolls back the source prayer insert.
-- Forward-only migration: do not edit the already-versioned historical migration.

create or replace function public.spiritual_growth_from_devotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.spiritual_growth_events (
    id,
    user_id,
    area,
    source,
    occurred_at,
    metadata
  )
  values (
    gen_random_uuid(),
    new.user_id,
    'devotion',
    'devotion_completed',
    coalesce(new.completed_at, now()),
    jsonb_build_object(
      'entity_id', new.id::text,
      'title', new.title
    )
  )
  on conflict (user_id, area, source, ((metadata ->> 'entity_id')))
    where (metadata ? 'entity_id')
  do nothing;

  return new;
end;
$$;

create or replace function public.spiritual_growth_from_prayer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.spiritual_growth_events (
    id,
    user_id,
    area,
    source,
    occurred_at,
    metadata
  )
  values (
    gen_random_uuid(),
    new.author_id,
    'prayer',
    'prayer_request_created',
    coalesce(new.created_at, now()),
    jsonb_build_object(
      'entity_id', new.id::text,
      'visibility', new.visibility
    )
  )
  on conflict (user_id, area, source, ((metadata ->> 'entity_id')))
    where (metadata ? 'entity_id')
  do nothing;

  return new;
end;
$$;

create or replace function public.spiritual_growth_from_answered_prayer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'answered' and new.status = 'answered' then
    insert into public.spiritual_growth_events (
      id,
      user_id,
      area,
      source,
      occurred_at,
      metadata
    )
    values (
      gen_random_uuid(),
      new.author_id,
      'prayer',
      'prayer_request_answered',
      coalesce(new.answered_at, now()),
      jsonb_build_object(
        'entity_id', new.id::text
      )
    )
    on conflict (user_id, area, source, ((metadata ->> 'entity_id')))
      where (metadata ? 'entity_id')
    do nothing;
  end if;

  return new;
end;
$$;

-- Preserve the historical least-privilege function execution posture.
revoke execute on function public.spiritual_growth_from_devotion() from public, anon, authenticated;
revoke execute on function public.spiritual_growth_from_prayer() from public, anon, authenticated;
revoke execute on function public.spiritual_growth_from_answered_prayer() from public, anon, authenticated;
