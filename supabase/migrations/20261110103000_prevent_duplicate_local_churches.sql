-- Prevent duplicate local churches within the same territorial jurisdiction.
-- Existing legacy duplicates are intentionally left untouched; this guard blocks
-- new duplicates while a separately approved consolidation is prepared.

begin;

create or replace function private.normalize_local_church_name(p_name text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  with normalized as (
    select btrim(regexp_replace(
      regexp_replace(
        translate(lower(btrim(p_name)),
          'áàâãäéèêëíìîïóòôõöúùûüçñ',
          'aaaaaeeeeiiiiooooouuuucn'
        ),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )) as full_name
  )
  select case
    when full_name ~ '^(igreja adventista do setimo dia|igreja adventista|i a s d|iasd)([[:space:]]+|$)'
      then btrim(regexp_replace(
        full_name,
        '^(igreja adventista do setimo dia|igreja adventista|i a s d|iasd)([[:space:]]+|$)',
        ''
      ))
    else full_name
  end
  from normalized;
$$;

create or replace function private.guard_duplicate_local_church_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  normalized_name text;
  scope_key text;
begin
  if new.organization_type <> 'LOCAL_CHURCH' then
    return new;
  end if;

  normalized_name := private.normalize_local_church_name(new.name);
  if normalized_name is null or normalized_name = '' then
    raise exception 'A local church must have a valid canonical name'
      using errcode = '22023';
  end if;

  scope_key := coalesce(new.parent_id::text, 'legacy-unassigned-jurisdiction');
  perform pg_advisory_xact_lock(hashtextextended(scope_key || ':' || normalized_name, 0));

  if exists (
    select 1
    from public.organizations existing
    where existing.organization_type = 'LOCAL_CHURCH'
      and existing.parent_id is not distinct from new.parent_id
      and existing.id is distinct from new.id
      and private.normalize_local_church_name(existing.name) = normalized_name
  ) then
    raise exception 'A local church with an equivalent name already exists in this Mission/Conference jurisdiction'
      using errcode = '23505',
            constraint = 'organizations_local_church_jurisdiction_name_unique';
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_local_church_name(text) from public;
revoke all on function private.guard_duplicate_local_church_name() from public;

drop trigger if exists organizations_duplicate_local_church_guard on public.organizations;
create trigger organizations_duplicate_local_church_guard
before insert or update of name, parent_id, organization_type
on public.organizations
for each row
execute function private.guard_duplicate_local_church_name();

commit;
