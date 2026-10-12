-- Secure, minimal profile search for authorized organization membership administrators.
-- Additive migration; do not deploy until reviewed and applied through the normal migration pipeline.
create or replace function public.search_organization_member_profiles(
  p_organization_id uuid,
  p_search text,
  p_limit integer default 10
)
returns table (
  id uuid,
  display_name text,
  first_name text,
  last_name text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_search text := btrim(coalesce(p_search, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '22023';
  end if;

  if char_length(v_search) < 2 then
    raise exception 'search must contain at least 2 characters' using errcode = '22023';
  end if;

  if not private.has_org_permission(p_organization_id, 'membership.manage') then
    raise exception 'membership management permission required' using errcode = '42501';
  end if;

  return query
    select p.id, p.display_name, p.first_name, p.last_name
    from public.profiles p
    where (
      coalesce(p.display_name, '') ilike '%' || replace(replace(replace(v_search, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'
      or coalesce(p.first_name, '') ilike '%' || replace(replace(replace(v_search, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'
      or coalesce(p.last_name, '') ilike '%' || replace(replace(replace(v_search, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'
    )
    order by coalesce(p.display_name, p.first_name || ' ' || p.last_name, '') asc
    limit v_limit;
end;
$$;

revoke all on function public.search_organization_member_profiles(uuid, text, integer) from public, anon;
grant execute on function public.search_organization_member_profiles(uuid, text, integer) to authenticated;
