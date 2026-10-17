-- Repair partial-index inference for transactional spiritual-growth triggers.
-- The production unique index is partial: WHERE metadata ? 'entity_id'.
-- Preserve the deployed trigger behavior, metadata, search_path hardening and grants;
-- only add the predicate required for PostgreSQL to infer that partial index.
-- Forward-only migration: do not edit already-versioned historical migrations.

create or replace function public.spiritual_growth_from_devotion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'pg_temp'
as $$
begin
  insert into public.spiritual_growth_events (id, user_id, area, source, occurred_at, metadata)
  values (
    gen_random_uuid(),
    new.user_id,
    'devotion',
    'devotion_completed',
    coalesce(new.completed_at, new.created_at, now()),
    jsonb_build_object('entity_id', new.id::text, 'devotion_id', new.id)
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
set search_path to 'pg_catalog', 'pg_temp'
as $$
begin
  insert into public.spiritual_growth_events (id, user_id, area, source, occurred_at, metadata)
  values (
    gen_random_uuid(),
    new.author_id,
    'prayer',
    'prayer_request_created',
    coalesce(new.created_at, now()),
    jsonb_build_object('entity_id', new.id::text, 'prayer_request_id', new.id)
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
set search_path to 'pg_catalog', 'pg_temp'
as $$
begin
  if new.status = 'answered' and coalesce(old.status, '') <> 'answered' then
    insert into public.spiritual_growth_events (id, user_id, area, source, occurred_at, metadata)
    values (
      gen_random_uuid(),
      new.author_id,
      'prayer',
      'prayer_request_answered',
      coalesce(new.answered_at, now()),
      jsonb_build_object('entity_id', new.id::text, 'prayer_request_id', new.id)
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
