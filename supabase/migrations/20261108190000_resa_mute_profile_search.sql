begin;

-- Muting is one-way: the viewer who muted an account should no longer see it
-- in profile search, while the target account's search visibility is unchanged.
create or replace function public.resa_search_profiles(
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  email text
)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select
    p.id,
    p.display_name,
    case
      when private.resa_profile_visibility_allowed(
        auth.uid(), p.id, coalesce(p.privacy->>'profile_visibility', 'friends')
      ) then p.first_name
    end,
    case
      when private.resa_profile_visibility_allowed(
        auth.uid(), p.id, coalesce(p.privacy->>'profile_visibility', 'friends')
      ) then p.last_name
    end,
    case
      when private.resa_profile_visibility_allowed(
        auth.uid(), p.id, coalesce(p.privacy->>'profile_visibility', 'friends')
      ) then p.avatar_url
    end,
    case
      when coalesce(p.privacy->>'profile_visibility', 'friends') = 'public' then u.email
    end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and p_query is not null
    and length(btrim(p_query)) between 2 and 120
    and private.resa_profile_visibility_allowed(
      auth.uid(), p.id, coalesce(p.privacy->>'profile_visibility', 'friends')
    )
    and not exists (
      select 1
      from public.resa_user_mutes m
      where m.muter_id = auth.uid()
        and m.muted_id = p.id
    )
    and (
      pg_catalog.strpos(pg_catalog.lower(coalesce(p.display_name, '')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.first_name, '')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.last_name, '')), pg_catalog.lower(btrim(p_query))) > 0
      or (
        coalesce(p.privacy->>'profile_visibility', 'friends') = 'public'
        and pg_catalog.strpos(pg_catalog.lower(coalesce(u.email, '')), pg_catalog.lower(btrim(p_query))) > 0
      )
      or p.id::text = btrim(p_query)
    )
  order by coalesce(p.display_name, p.first_name, p.id::text), p.id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$function$;

commit;
