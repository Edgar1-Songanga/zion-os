-- Harden RESA profile search authorization.
-- The function remains SECURITY DEFINER because it reads auth.users,
-- but execution is restricted to authenticated users and anonymous callers
-- are explicitly denied. The function also rejects calls without an auth.uid().
create or replace function public.resa_search_profiles(p_query text, p_limit integer default 20)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql
security definer
set search_path to 'public'
as $function$
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
    and coalesce(p.privacy->>'profile_visibility','community') <> 'private'
    and (
      p_query is null
      or btrim(p_query) = ''
      or p.display_name ilike '%' || btrim(p_query) || '%'
      or p.first_name ilike '%' || btrim(p_query) || '%'
      or p.last_name ilike '%' || btrim(p_query) || '%'
      or u.email ilike '%' || btrim(p_query) || '%'
      or p.id::text = btrim(p_query)
    )
  order by coalesce(p.display_name, p.first_name, u.email), p.id
  limit greatest(1, least(coalesce(p_limit,20),100));
$function$;

revoke execute on function public.resa_search_profiles(text, integer) from public;
grant execute on function public.resa_search_profiles(text, integer) to authenticated;