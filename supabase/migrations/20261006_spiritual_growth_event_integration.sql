-- Phase 2: derive spiritual growth events from real persisted activity.
-- These triggers keep the growth timeline transactional with the source action.

create unique index if not exists spiritual_growth_events_entity_source_uidx
  on public.spiritual_growth_events(
    user_id,
    area,
    source,
    ((metadata ->> 'entity_id'))
  )
  where metadata ? 'entity_id';

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
  do nothing;

  return new;
end;
$$;

drop trigger if exists spiritual_growth_after_devotion on public.spiritual_devotions;

create trigger spiritual_growth_after_devotion
after insert on public.spiritual_devotions
for each row
execute function public.spiritual_growth_from_devotion();

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
  do nothing;

  return new;
end;
$$;

drop trigger if exists spiritual_growth_after_prayer on public.resa_prayer_requests;

create trigger spiritual_growth_after_prayer
after insert on public.resa_prayer_requests
for each row
execute function public.spiritual_growth_from_prayer();

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
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists spiritual_growth_after_answered_prayer on public.resa_prayer_requests;

create trigger spiritual_growth_after_answered_prayer
after update of status on public.resa_prayer_requests
for each row
execute function public.spiritual_growth_from_answered_prayer();

revoke execute on function public.spiritual_growth_from_devotion() from public, anon, authenticated;
revoke execute on function public.spiritual_growth_from_prayer() from public, anon, authenticated;
revoke execute on function public.spiritual_growth_from_answered_prayer() from public, anon, authenticated;
