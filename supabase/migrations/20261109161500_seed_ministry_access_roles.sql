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
