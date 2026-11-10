-- Audited, reversible-by-admin archive workflow for local churches.
-- Historical records are retained; direct hard deletion is intentionally blocked.
begin;

alter table public.organizations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists archive_reason text;

insert into public.permissions (key, name, description)
values (
  'organization.archive',
  'Archive local churches within the Mission',
  'Allows an authorized Mission secretary to archive a local church within their Mission while preserving records and audit history.'
)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'secretary'
  and p.key = 'organization.archive'
on conflict do nothing;

create or replace function private.guard_organization_archive_state()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public', 'private'
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Organizations cannot be hard-deleted; use the audited archive workflow.'
      using errcode = '55000';
  end if;

  if old.archived_at is not null and (
    new.archived_at is distinct from old.archived_at
    or new.archived_by is distinct from old.archived_by
    or new.archive_reason is distinct from old.archive_reason
    or new.is_active
  ) then
    raise exception 'Archived organizations are immutable through ordinary updates.'
      using errcode = '55000';
  end if;

  if old.is_active and not new.is_active
    and current_setting('zion.archive_operation', true) is distinct from 'on' then
    raise exception 'Use the audited organization archive workflow.'
      using errcode = '55000';
  end if;

  if new.archived_at is not null and old.archived_at is null
    and current_setting('zion.archive_operation', true) is distinct from 'on' then
    raise exception 'Archive metadata can only be written by the audited archive workflow.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_archive_state_guard on public.organizations;
create trigger organizations_archive_state_guard
before update or delete on public.organizations
for each row execute function private.guard_organization_archive_state();

create or replace function private.zion_archive_local_church(
  p_organization_id uuid,
  p_reason text
)
returns public.organizations
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $$
declare
  v_org public.organizations%rowtype;
  v_parent public.organizations%rowtype;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 or length(trim(p_reason)) > 500 then
    raise exception 'A reason between 3 and 500 characters is required.'
      using errcode = '22023';
  end if;

  select * into v_org
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then
    raise exception 'Organization not found.'
      using errcode = 'P0002';
  end if;

  if v_org.organization_type <> 'LOCAL_CHURCH' then
    raise exception 'Only local churches can be archived through this workflow.'
      using errcode = '22023';
  end if;

  if not v_org.is_active or v_org.archived_at is not null then
    raise exception 'This church is already inactive or archived.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.organizations child
    where child.parent_id = v_org.id and child.is_active
  ) then
    raise exception 'Archive or transfer active subordinate organizations first.'
      using errcode = '55000';
  end if;

  if not private.is_verified_zion_global_admin() then
    if v_org.parent_id is null then
      raise exception 'Only a verified global administrator can archive a root local church.'
        using errcode = '42501';
    end if;

    select * into v_parent
    from public.organizations
    where id = v_org.parent_id
      and organization_type = 'MISSION'
      and is_active;

    if not found or not private.has_org_permission(v_org.parent_id, 'organization.archive') then
      raise exception 'A secretary with archive permission in the parent Mission is required.'
        using errcode = '42501';
    end if;
  end if;

  perform set_config('zion.archive_operation', 'on', true);

  update public.organization_memberships
  set status = 'INACTIVE',
      updated_at = now()
  where organization_id = v_org.id
    and status = 'ACTIVE';

  update public.organizations
  set is_active = false,
      archived_at = now(),
      archived_by = v_actor,
      archive_reason = trim(p_reason),
      updated_at = now()
  where id = v_org.id
  returning * into v_org;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) values (
    v_org.id,
    v_actor,
    'ORGANIZATION_ARCHIVED',
    'ORGANIZATION',
    v_org.id,
    jsonb_build_object(
      'name', v_org.name,
      'organization_type', v_org.organization_type,
      'parent_id', v_org.parent_id,
      'reason', v_org.archive_reason,
      'archived_at', v_org.archived_at
    )
  );

  return v_org;
end;
$$;

revoke all on function private.zion_archive_local_church(uuid, text) from public, anon, authenticated;

create or replace function private.zion_list_archivable_local_churches()
returns table (
  id uuid,
  name text,
  slug text,
  parent_id uuid,
  is_active boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $list$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  return query
  select o.id, o.name, o.slug, o.parent_id, o.is_active
  from public.organizations o
  where o.organization_type = 'LOCAL_CHURCH'
    and o.is_active
    and o.archived_at is null
    and (
      private.is_verified_zion_global_admin()
      or (
        o.parent_id is not null
        and exists (
          select 1 from public.organizations m
          where m.id = o.parent_id
            and m.organization_type = 'MISSION'
            and m.is_active
        )
        and private.has_org_permission(o.parent_id, 'organization.archive')
      )
    )
  order by o.name asc;
end;
$list$;

revoke all on function private.zion_list_archivable_local_churches() from public, anon, authenticated;

-- PostgREST exposes the public schema. Keep the privileged implementation private
-- and publish only these authenticated SECURITY DEFINER entry points.
create or replace function public.zion_archive_local_church(
  p_organization_id uuid,
  p_reason text
)
returns public.organizations
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $archive$
  select private.zion_archive_local_church(p_organization_id, p_reason);
$archive$;

create or replace function public.zion_list_archivable_local_churches()
returns table (
  id uuid,
  name text,
  slug text,
  parent_id uuid,
  is_active boolean
)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $list_api$
  select * from private.zion_list_archivable_local_churches();
$list_api$;

revoke all on function public.zion_archive_local_church(uuid, text) from public, anon;
revoke all on function public.zion_list_archivable_local_churches() from public, anon;
grant execute on function public.zion_archive_local_church(uuid, text) to authenticated;
grant execute on function public.zion_list_archivable_local_churches() to authenticated;

commit;
