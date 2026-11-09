-- Add explicit organization membership roles for ministry-level access.
-- These role records do not grant data access by themselves: module data remains
-- constrained by organization membership, ministry_leaders assignments and RLS.
insert into public.roles (key, name, description, is_system)
values
  ('ministry_leader', 'Ministry Leader', 'Leads an assigned church ministry within the organization.', true),
  ('department_leader', 'Department Leader', 'Leads an assigned department within the organization.', true),
  ('stewardship_manager', 'Stewardship Ministry Leader', 'Leads Christian stewardship ministry operations for an assigned ministry.', true),
  ('youth_director', 'Youth Ministry Director', 'Leads youth ministry operations within the organization.', true)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = true;

-- A stewardship assignment is scoped to the ministry leader's verified appointment.
drop policy if exists stewardship_period_reports_read on public.stewardship_period_reports;
create policy stewardship_period_reports_read
on public.stewardship_period_reports
for select to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1
    from public.ministry_leaders ml
    where ml.ministry_id = stewardship_period_reports.ministry_id
      and ml.user_id = (select auth.uid())
      and ml.verified = true
  )
);

drop policy if exists stewardship_period_reports_insert on public.stewardship_period_reports;
create policy stewardship_period_reports_insert
on public.stewardship_period_reports
for insert to authenticated
with check (
  (
    private.has_org_permission(organization_id, 'organization.manage')
    or exists (
      select 1
      from public.ministry_leaders ml
      where ml.ministry_id = stewardship_period_reports.ministry_id
        and ml.user_id = (select auth.uid())
        and ml.verified = true
    )
  )
  and submitted_by = (select auth.uid())
);

drop policy if exists stewardship_period_reports_update on public.stewardship_period_reports;
create policy stewardship_period_reports_update
on public.stewardship_period_reports
for update to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1
    from public.ministry_leaders ml
    where ml.ministry_id = stewardship_period_reports.ministry_id
      and ml.user_id = (select auth.uid())
      and ml.verified = true
  )
)
with check (
  (
    private.has_org_permission(organization_id, 'organization.manage')
    or exists (
      select 1
      from public.ministry_leaders ml
      where ml.ministry_id = stewardship_period_reports.ministry_id
        and ml.user_id = (select auth.uid())
        and ml.verified = true
    )
  )
  and submitted_by = (select auth.uid())
);

-- Allow verified global administrators and organization owners to assign local roles.
-- The organization owner role itself remains non-assignable through this flow.
create or replace function private.can_assign_org_role(target_org uuid, target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth
as $function$
  select (
    private.is_verified_zion_global_admin()
    and exists (
      select 1 from public.roles target_role
      where target_role.id = target_role_id
        and target_role.key <> 'organization_owner'
    )
  ) or exists (
    select 1
    from public.organization_memberships actor_membership
    join public.role_permissions actor_rp on actor_rp.role_id = actor_membership.role_id
    join public.permissions actor_permission on actor_permission.id = actor_rp.permission_id
    join public.roles target_role on target_role.id = target_role_id
    where actor_membership.organization_id = target_org
      and actor_membership.user_id = auth.uid()
      and actor_membership.status = 'ACTIVE'
      and actor_permission.key = 'membership.role.assign'
      and target_role.key <> 'organization_owner'
  );
$function$;

create or replace function private.can_update_org_membership(target_org uuid, target_membership uuid, target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth
as $function$
  select private.has_org_permission(target_org, 'membership.manage')
    and not exists (
      select 1
      from public.organization_memberships current_membership
      join public.roles current_role on current_role.id = current_membership.role_id
      where current_membership.id = target_membership
        and current_role.key = 'organization_owner'
    )
    and (
      private.can_assign_org_role(target_org, target_role_id)
      or exists (
        select 1 from public.organization_memberships current_membership
        where current_membership.id = target_membership
          and current_membership.organization_id = target_org
          and current_membership.role_id = target_role_id
      )
    );
$function$;
