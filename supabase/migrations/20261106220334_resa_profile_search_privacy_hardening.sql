begin;

-- Profile lookup RPCs are callable only by signed-in users. Keep the execution
-- search path minimal and reject unbounded/blank discovery queries.
create or replace function public.resa_profiles_for_ids(p_user_ids uuid[])
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select p.id, p.display_name,
    case when coalesce(p.privacy->>'profile_visibility', 'community') <> 'private' then p.first_name end,
    case when coalesce(p.privacy->>'profile_visibility', 'community') <> 'private' then p.last_name end,
    case when coalesce(p.privacy->>'profile_visibility', 'community') <> 'private' then p.avatar_url end,
    case when coalesce(p.privacy->>'profile_visibility', 'community') = 'public' then u.email end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and cardinality(coalesce(p_user_ids, array[]::uuid[])) between 1 and 200
    and coalesce(p.privacy->>'profile_visibility', 'community') <> 'private'
    and p.id = any(coalesce(p_user_ids, array[]::uuid[]))
  order by coalesce(p.display_name, p.first_name, u.email), p.id
  limit 200;
$$;

create or replace function public.resa_search_profiles(p_query text, p_limit integer default 20)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select
    p.id,
    p.display_name,
    case when coalesce(p.privacy->>'profile_visibility','community') <> 'private' then p.first_name end,
    case when coalesce(p.privacy->>'profile_visibility','community') <> 'private' then p.last_name end,
    case when coalesce(p.privacy->>'profile_visibility','community') <> 'private' then p.avatar_url end,
    case when coalesce(p.privacy->>'profile_visibility','community') = 'public' then u.email end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and p_query is not null
    and length(btrim(p_query)) between 2 and 120
    and coalesce(p.privacy->>'profile_visibility','community') <> 'private'
    and (
      pg_catalog.strpos(pg_catalog.lower(coalesce(p.display_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.first_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.last_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or (
        coalesce(p.privacy->>'profile_visibility','community') = 'public'
        and pg_catalog.strpos(pg_catalog.lower(coalesce(u.email,'')), pg_catalog.lower(btrim(p_query))) > 0
      )
      or p.id::text = btrim(p_query)
    )
  order by coalesce(p.display_name, p.first_name, p.id::text), p.id
  limit greatest(1, least(coalesce(p_limit,20),100));
$$;

revoke all on function public.resa_profiles_for_ids(uuid[]) from public, anon;
revoke all on function public.resa_search_profiles(text, integer) from public, anon;
grant execute on function public.resa_profiles_for_ids(uuid[]) to authenticated;
grant execute on function public.resa_search_profiles(text, integer) to authenticated;

commit;
