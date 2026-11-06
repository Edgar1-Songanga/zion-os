-- Enforce organization boundaries and acyclic parent relationships for departments/units.
-- Existing organization_units rows are preserved; this migration adds guards only.

-- Refuse to install the guard over inconsistent legacy data.
do $preflight$
declare
  has_cycle boolean;
begin
  if exists (
    select 1
      from public.organization_units child
      join public.organization_units parent on parent.id = child.parent_id
     where child.organization_id is distinct from parent.organization_id
  ) then
    raise exception 'Existing department hierarchy contains cross-organization parent links';
  end if;

  with recursive walk(start_id, current_id, parent_id, visited, cycle_found) as (
    select u.id, u.id, u.parent_id, array[u.id], false
      from public.organization_units u
    union all
    select w.start_id, parent.id, parent.parent_id,
           w.visited || parent.id, parent.id = any(w.visited)
      from walk w
      join public.organization_units parent on parent.id = w.parent_id
     where not w.cycle_found
  )
  select exists (select 1 from walk where cycle_found)
    into has_cycle;

  if has_cycle then
    raise exception 'Existing department hierarchy contains a cycle';
  end if;
end;
$preflight$;

create or replace function private.enforce_organization_unit_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  parent_org_id uuid;
  cycle_found boolean := false;
begin
  -- Serialize hierarchy edits within one organization to prevent concurrent
  -- transactions from creating a cycle through competing parent changes.
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 0));

  if new.parent_id is null then
    parent_org_id := null;
  else
    select u.organization_id
      into parent_org_id
      from public.organization_units u
     where u.id = new.parent_id
     for key share;

    if parent_org_id is null then
      raise exception 'Parent department does not exist';
    end if;

    if parent_org_id is distinct from new.organization_id then
      raise exception 'A department parent must belong to the same organization';
    end if;

    if new.parent_id = new.id then
      raise exception 'A department cannot be its own parent';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id
     and exists (
       select 1
         from public.organization_units child
        where child.parent_id = old.id
          and child.organization_id is distinct from new.organization_id
     ) then
    raise exception 'Moving this department would split its hierarchy across organizations';
  end if;

  if new.parent_id is not null then
    with recursive ancestors(id, parent_id, visited) as (
      select u.id, u.parent_id, array[u.id]
        from public.organization_units u
       where u.id = new.parent_id
      union all
      select parent.id, parent.parent_id, child.visited || parent.id
        from public.organization_units parent
        join ancestors child on parent.id = child.parent_id
       where not parent.id = any(child.visited)
    )
    select exists (select 1 from ancestors where id = new.id)
      into cycle_found;

    if cycle_found then
      raise exception 'Department hierarchy cannot contain cycles';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists organization_units_hierarchy_guard on public.organization_units;
create trigger organization_units_hierarchy_guard
before insert or update of organization_id, parent_id
on public.organization_units
for each row execute function private.enforce_organization_unit_hierarchy();

create index if not exists idx_organization_units_org_parent
  on public.organization_units(organization_id, parent_id);
