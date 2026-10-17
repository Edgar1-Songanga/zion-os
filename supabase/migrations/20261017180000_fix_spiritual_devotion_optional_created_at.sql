-- Make the devotion timestamp fallback compatible with the actual source-row shape.
-- Some deployed spiritual_devotions schemas do not expose created_at. Access that
-- optional field through JSON so a missing key yields NULL instead of aborting the
-- source transaction. This is a forward-only migration; never edit prior migrations.

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
    coalesce(
      new.completed_at,
      nullif(to_jsonb(new) ->> 'created_at', '')::timestamptz,
      now()
    ),
    jsonb_build_object('entity_id', new.id::text, 'devotion_id', new.id)
  )
  on conflict (user_id, area, source, ((metadata ->> 'entity_id')))
    where (metadata ? 'entity_id')
  do nothing;
  return new;
end;
$$;

revoke execute on function public.spiritual_growth_from_devotion() from public, anon, authenticated;
