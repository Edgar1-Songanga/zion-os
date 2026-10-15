-- Security hardening: remove the legacy permissive membership bootstrap policy.
-- RLS permissive policies are OR-combined, so the older policy could bypass the
-- stricter role/status checks added by organization_owner_role_authorization_v3.
drop policy if exists "memberships_insert_owner_bootstrap" on public.organization_memberships;

-- Make hierarchy authorization terminate safely even if pre-existing data contains a cycle.
create or replace function private.has_org_permission_in_hierarchy(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with recursive org_tree(id, parent_id, visited) as (
    select o.id, o.parent_id, array[o.id]::uuid[]
    from public.organizations o
    where o.id = target_org

    union all

    select parent.id, parent.parent_id, child.visited || parent.id
    from public.organizations parent
    join org_tree child on child.parent_id = parent.id
    where not (parent.id = any(child.visited))
  )
  select exists (
    select 1
    from org_tree t
    join public.organization_memberships m on m.organization_id = t.id
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and p.key = permission_key
  );
$$;

-- Prevent new or updated organization parent links from creating a cycle.
create or replace function private.prevent_organization_hierarchy_cycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'organization_hierarchy_cycle';
  end if;

  if exists (
    with recursive ancestors(id, parent_id, visited) as (
      select o.id, o.parent_id, array[o.id]::uuid[]
      from public.organizations o
      where o.id = new.parent_id

      union all

      select parent.id, parent.parent_id, child.visited || parent.id
      from public.organizations parent
      join ancestors child on child.parent_id = parent.id
      where not (parent.id = any(child.visited))
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'organization_hierarchy_cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_prevent_hierarchy_cycle on public.organizations;
create trigger organizations_prevent_hierarchy_cycle
before insert or update of parent_id on public.organizations
for each row execute function private.prevent_organization_hierarchy_cycle();

-- Existing cycles, if any, must be detected and corrected before relying on
-- hierarchy inheritance. This migration prevents new cycles and makes reads terminate.
