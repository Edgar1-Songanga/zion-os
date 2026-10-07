drop policy if exists payroll_run_access on public.payroll_runs;
create policy payroll_run_access on public.payroll_runs for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'payroll.read'))
with check (
  private.has_org_permission_in_hierarchy(organization_id,'payroll.manage')
  or private.has_org_permission_in_hierarchy(organization_id,'payroll.approve')
);