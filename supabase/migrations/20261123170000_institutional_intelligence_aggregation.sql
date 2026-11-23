-- Institutional Intelligence: authorized subtree aggregates with privacy-safe membership counts.
-- This RPC returns aggregate values only. It never returns member, report or ministry rows.

begin;

insert into public.permissions (key, name, description)
values (
  'institutional.analytics.read',
  'Read institutional analytics',
  'Read governed, aggregate institutional indicators for the assigned organization and its authorized subordinate organizations.'
)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

-- The permission is deliberately separate from membership, finance, HR and payroll access.
-- These leadership roles receive aggregate reporting only; this does not grant source-table access.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'institutional.analytics.read'
where r.key in (
  'secretary',
  'pastor',
  'organization_leader',
  'organization_admin',
  'organization_owner'
)
on conflict do nothing;

create or replace function public.zion_institutional_intelligence(p_organization_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_root record;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select o.id, o.name, o.organization_type
    into v_root
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  if not (
    private.is_verified_zion_global_admin()
    or private.has_org_permission_in_hierarchy(p_organization_id, 'institutional.analytics.read')
  ) then
    raise exception 'institutional_analytics_permission_required' using errcode = '42501';
  end if;

  with recursive org_scope(id, parent_id, name, organization_type, is_active, depth, visited) as (
    select o.id, o.parent_id, o.name, o.organization_type, o.is_active, 0, array[o.id]
    from public.organizations o
    where o.id = p_organization_id

    union all

    select child.id, child.parent_id, child.name, child.organization_type,
           child.is_active, parent.depth + 1, parent.visited || child.id
    from public.organizations child
    join org_scope parent on child.parent_id = parent.id
    where not child.id = any(parent.visited)
  ),
  metrics as (
    select
      (select count(*)::bigint from org_scope where is_active) as active_organizations,
      (select count(*)::bigint
         from public.organization_units u
         join org_scope s on s.id = u.organization_id
        where u.is_active = true and u.unit_type = 'DEPARTMENT') as active_departments,
      (select count(*)::bigint
         from public.ministries m
         join org_scope s on s.id = m.organization_id
        where m.status = 'ACTIVE') as active_ministries,
      (select count(*)::bigint
         from public.ministry_programs p
         join public.ministries m on m.id = p.ministry_id
         join org_scope s on s.id = m.organization_id
        where p.status = 'ACTIVE' and m.status = 'ACTIVE') as active_programs,
      (select count(*)::bigint
         from public.ministry_reports r
         join public.ministries m on m.id = r.ministry_id
         join org_scope s on s.id = m.organization_id
        where r.status = 'PENDING') as pending_ministry_reports,
      (select count(*)::bigint
         from public.ministry_reports r
         join public.ministries m on m.id = r.ministry_id
         join org_scope s on s.id = m.organization_id
        where r.status = 'APPROVED') as approved_ministry_reports,
      (select count(*)::bigint
         from public.church_member_records cm
         join org_scope s on s.id = cm.organization_id
        where cm.membership_status = 'ACTIVE') as active_church_members,
      greatest(
        coalesce((select max(o.updated_at) from public.organizations o where o.id in (select id from org_scope)), '-infinity'::timestamptz),
        coalesce((select max(u.updated_at) from public.organization_units u where u.organization_id in (select id from org_scope)), '-infinity'::timestamptz),
        coalesce((select max(m.updated_at) from public.ministries m where m.organization_id in (select id from org_scope)), '-infinity'::timestamptz),
        coalesce((select max(p.created_at) from public.ministry_programs p join public.ministries m on m.id = p.ministry_id where m.organization_id in (select id from org_scope)), '-infinity'::timestamptz),
        coalesce((select max(r.submitted_at) from public.ministry_reports r join public.ministries m on m.id = r.ministry_id where m.organization_id in (select id from org_scope)), '-infinity'::timestamptz),
        coalesce((select max(cm.updated_at) from public.church_member_records cm where cm.organization_id in (select id from org_scope)), '-infinity'::timestamptz)
      ) as data_as_of
  ),
  per_organization as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', scoped.id,
          'name', scoped.name,
          'organization_type', scoped.organization_type,
          'is_active', scoped.is_active,
          'depth', scoped.depth,
          'active_departments', scoped.active_departments,
          'active_ministries', scoped.active_ministries,
          'active_programs', scoped.active_programs,
          'pending_ministry_reports', scoped.pending_ministry_reports,
          'approved_ministry_reports', scoped.approved_ministry_reports
        )
        order by scoped.depth, scoped.name
      ),
      '[]'::jsonb
    ) as rows
    from (
      select
        s.id, s.name, s.organization_type, s.is_active, s.depth,
        (select count(*)::bigint from public.organization_units u
          where u.organization_id = s.id and u.is_active = true and u.unit_type = 'DEPARTMENT') as active_departments,
        (select count(*)::bigint from public.ministries m
          where m.organization_id = s.id and m.status = 'ACTIVE') as active_ministries,
        (select count(*)::bigint from public.ministry_programs p
          join public.ministries m on m.id = p.ministry_id
          where m.organization_id = s.id and m.status = 'ACTIVE' and p.status = 'ACTIVE') as active_programs,
        (select count(*)::bigint from public.ministry_reports r
          join public.ministries m on m.id = r.ministry_id
          where m.organization_id = s.id and r.status = 'PENDING') as pending_ministry_reports,
        (select count(*)::bigint from public.ministry_reports r
          join public.ministries m on m.id = r.ministry_id
          where m.organization_id = s.id and r.status = 'APPROVED') as approved_ministry_reports
      from org_scope s
    ) scoped
  )
  select jsonb_build_object(
    'status', 'LIVE_AGGREGATE',
    'generated_at', clock_timestamp(),
    'scope', jsonb_build_object(
      'root_organization_id', v_root.id,
      'root_organization_name', v_root.name,
      'root_organization_type', v_root.organization_type,
      'included_organizations', (select count(*) from org_scope)
    ),
    'metrics', jsonb_build_object(
      'active_organizations', metrics.active_organizations,
      'active_departments', metrics.active_departments,
      'active_ministries', metrics.active_ministries,
      'active_programs', metrics.active_programs,
      'pending_ministry_reports', metrics.pending_ministry_reports,
      'approved_ministry_reports', metrics.approved_ministry_reports,
      'active_church_members', case
        when metrics.active_church_members >= 5
          then jsonb_build_object('value', metrics.active_church_members, 'status', 'AVAILABLE', 'minimum_group_size', 5)
        else jsonb_build_object('value', null, 'status', 'SUPPRESSED', 'minimum_group_size', 5)
      end
    ),
    'by_organization', per_organization.rows,
    'data_quality', jsonb_build_object(
      'membership_aggregate', case
        when metrics.active_church_members >= 5 then 'AVAILABLE'
        else 'SUPPRESSED_BELOW_MINIMUM_GROUP_SIZE'
      end,
      'historical_comparison', 'INSUFFICIENT_HISTORY',
      'forecasting', 'NOT_ENABLED',
      'data_as_of', nullif(metrics.data_as_of, '-infinity'::timestamptz)
    ),
    'lineage', jsonb_build_object(
      'organizations', 'public.organizations',
      'departments', 'public.organization_units',
      'ministries', 'public.ministries',
      'programs', 'public.ministry_programs',
      'ministry_reports', 'public.ministry_reports',
      'church_membership', 'public.church_member_records',
      'calculation_version', '2026-11-23.1'
    )
  )
  into v_result
  from metrics
  cross join per_organization;


  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    p_organization_id,
    auth.uid(),
    'institutional.analytics.viewed',
    'institutional_analytics',
    p_organization_id,
    jsonb_build_object(
      'included_organizations', v_result #>> '{scope,included_organizations}',
      'calculation_version', '2026-11-23.1',
      'membership_suppressed', v_result #>> '{data_quality,membership_aggregate}' <> 'AVAILABLE'
    )
  );

  return v_result;
end;
$function$;

comment on function public.zion_institutional_intelligence(uuid) is
  'Returns aggregate-only institutional intelligence for an authorized organization subtree. Membership counts below five are suppressed; no source records are returned.';

revoke all on function public.zion_institutional_intelligence(uuid) from public, anon;
grant execute on function public.zion_institutional_intelligence(uuid) to authenticated;

commit;
