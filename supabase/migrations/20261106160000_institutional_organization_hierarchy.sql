-- Institutional hierarchy foundation.
-- Existing standalone LOCAL_CHURCH rows remain valid; this migration does not
-- reparent or otherwise mutate existing organizations.

alter table public.organizations
  drop constraint if exists organizations_type_check;

alter table public.organizations
  add constraint organizations_type_check
  check (organization_type in (
    'GENERAL_CONFERENCE',
    'DIVISION',
    'UNION',
    'CONFERENCE',
    'MISSION',
    'LOCAL_CHURCH'
  ));

create index if not exists idx_organizations_type_parent
  on public.organizations(organization_type, parent_id);

create or replace function private.organization_parent_type_allowed(
  child_type text,
  parent_type text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $function$
  select case child_type
    when 'GENERAL_CONFERENCE' then parent_type is null
    when 'DIVISION' then parent_type = 'GENERAL_CONFERENCE'
    when 'UNION' then parent_type = 'DIVISION'
    when 'CONFERENCE' then parent_type = 'UNION'
    when 'MISSION' then parent_type = 'UNION'
    when 'LOCAL_CHURCH' then parent_type is null or parent_type in ('UNION', 'CONFERENCE', 'MISSION')
    else false
  end;
$function$;

create or replace function private.enforce_organization_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  parent_type text;
  ancestor_id uuid;
begin
  if new.parent_id = new.id then
    raise exception 'An organization cannot be its own parent';
  end if;

  if new.parent_id is null then
    parent_type := null;
  else
    select organization_type into parent_type
    from public.organizations
    where id = new.parent_id
    for key share;

    if parent_type is null then
      raise exception 'Parent organization does not exist';
    end if;
  end if;

  if not private.organization_parent_type_allowed(new.organization_type, parent_type) then
    raise exception 'Invalid parent level for organization type %', new.organization_type;
  end if;

  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
    with recursive ancestors(id, parent_id) as (
      select id, parent_id from public.organizations where id = new.parent_id
      union all
      select o.id, o.parent_id
      from public.organizations o
      join ancestors a on o.id = a.parent_id
    )
    select id into ancestor_id from ancestors where id = new.id limit 1;

    if ancestor_id is not null then
      raise exception 'Organization hierarchy cannot contain cycles';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists organizations_hierarchy_guard on public.organizations;
create trigger organizations_hierarchy_guard
before insert or update of organization_type, parent_id
on public.organizations
for each row execute function private.enforce_organization_hierarchy();

create or replace function public.zion_create_institutional_organization(
  p_name text,
  p_slug text,
  p_organization_type text,
  p_parent_id uuid default null
)
returns public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  created public.organizations;
  parent_type text;
  app_meta jsonb;
begin
  app_meta := coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb);
  if auth.uid() is null
     or (app_meta ->> 'zion_global_role') is distinct from 'global_admin'
     or (app_meta -> 'zion_verified') is distinct from 'true'::jsonb then
    raise exception 'A verified ZION global administrator is required'
      using errcode = '42501';
  end if;

  if p_organization_type not in (
    'GENERAL_CONFERENCE', 'DIVISION', 'UNION', 'CONFERENCE', 'MISSION'
  ) then
    raise exception 'Unsupported institutional organization type';
  end if;

  if nullif(btrim(p_name), '') is null
     or nullif(lower(btrim(p_slug)), '') is null then
    raise exception 'Organization name and slug are required';
  end if;

  if p_parent_id is not null then
    select organization_type into parent_type
    from public.organizations where id = p_parent_id;
    if parent_type is null then
      raise exception 'Parent organization does not exist';
    end if;
  end if;

  if not private.organization_parent_type_allowed(p_organization_type, parent_type) then
    raise exception 'Invalid parent level for organization type %', p_organization_type;
  end if;

  insert into public.organizations (
    name, slug, organization_type, parent_id, created_by
  ) values (
    btrim(p_name), lower(btrim(p_slug)), p_organization_type, p_parent_id, auth.uid()
  )
  returning * into created;

  return created;
end;
$function$;

create or replace function public.zion_get_organization_hierarchy(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  organization_type text,
  parent_id uuid,
  depth integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  app_meta jsonb;
begin
  app_meta := coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb);
  if auth.uid() is null or not (
    exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.status = 'ACTIVE'
    )
    or exists (
      select 1 from public.organizations o
      where o.id = p_organization_id and o.created_by = auth.uid()
    )
    or (
      (app_meta ->> 'zion_global_role') is not distinct from 'global_admin'
      and (app_meta -> 'zion_verified') is not distinct from 'true'::jsonb
    )
  ) then
    raise exception 'Active organization membership is required to view this hierarchy'
      using errcode = '42501';
  end if;

  return query
    with recursive hierarchy(org_id, org_name, org_type, org_parent_id, level_depth, visited) as (
      select o.id, o.name, o.organization_type, o.parent_id, 0, array[o.id]
      from public.organizations o
      where o.id = p_organization_id
      union all
      select parent.id, parent.name, parent.organization_type, parent.parent_id, child.level_depth + 1, child.visited || parent.id
      from public.organizations parent
      join hierarchy child on parent.id = child.org_parent_id
      where not parent.id = any(child.visited)
    )
    select h.org_id, h.org_name, h.org_type, h.org_parent_id, h.level_depth
    from hierarchy h
    order by h.level_depth desc;
end;
$function$;

revoke all on function public.zion_get_organization_hierarchy(uuid) from public, anon;
grant execute on function public.zion_get_organization_hierarchy(uuid) to authenticated;

create or replace function public.zion_list_institutional_organizations()
returns setof public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  app_meta jsonb;
begin
  app_meta := coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb);
  if auth.uid() is null
     or (app_meta ->> 'zion_global_role') is distinct from 'global_admin'
     or (app_meta -> 'zion_verified') is distinct from 'true'::jsonb then
    raise exception 'A verified ZION global administrator is required'
      using errcode = '42501';
  end if;

  return query
    select o.*
    from public.organizations o
    order by
      case o.organization_type
        when 'GENERAL_CONFERENCE' then 1
        when 'DIVISION' then 2
        when 'UNION' then 3
        when 'CONFERENCE' then 4
        when 'MISSION' then 5
        when 'LOCAL_CHURCH' then 6
        else 7
      end,
      o.name asc;
end;
$function$;

revoke all on function public.zion_list_institutional_organizations() from public, anon;
grant execute on function public.zion_list_institutional_organizations() to authenticated;

revoke all on function public.zion_create_institutional_organization(text, text, text, uuid) from public, anon;
grant execute on function public.zion_create_institutional_organization(text, text, text, uuid) to authenticated;
