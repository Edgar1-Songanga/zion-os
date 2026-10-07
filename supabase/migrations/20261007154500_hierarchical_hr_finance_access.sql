-- Hierarchical organization access and HR cross-organization integrity.
create or replace function private.has_org_permission_in_hierarchy(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with recursive org_tree as (
    select o.id, o.parent_id from public.organizations o where o.id = target_org
    union all
    select parent.id, parent.parent_id from public.organizations parent join org_tree child on child.parent_id = parent.id
  )
  select exists (
    select 1 from org_tree t
    join public.organization_memberships m on m.organization_id = t.id
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid() and m.status = 'ACTIVE' and p.key = permission_key
  );
$$;

create or replace function public.validate_hr_employee_org()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.department_unit_id is not null and not exists (
    select 1 from public.organization_units u where u.id = new.department_unit_id and u.organization_id = new.organization_id
  ) then raise exception 'hr_employee_department_unit_wrong_organization'; end if;
  if new.manager_employee_id is not null and not exists (
    select 1 from public.hr_employees e where e.id = new.manager_employee_id and e.organization_id = new.organization_id
  ) then raise exception 'hr_employee_manager_wrong_organization'; end if;
  return new;
end; $$;

drop trigger if exists hr_employee_org_integrity on public.hr_employees;
create trigger hr_employee_org_integrity before insert or update on public.hr_employees
for each row execute function public.validate_hr_employee_org();

-- HR/payroll/finance access follows the organization hierarchy.
drop policy if exists hr_employee_access on public.hr_employees;
create policy hr_employee_access on public.hr_employees for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'hr.read') or user_id=(select auth.uid()))
with check (private.has_org_permission_in_hierarchy(organization_id,'hr.manage'));

drop policy if exists hr_contract_access on public.hr_contracts;
create policy hr_contract_access on public.hr_contracts for all to authenticated
using (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission_in_hierarchy(e.organization_id,'hr.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e where e.id=employee_id and private.has_org_permission_in_hierarchy(e.organization_id,'hr.contract.manage')));

drop policy if exists hr_component_access on public.hr_payroll_components;
create policy hr_component_access on public.hr_payroll_components for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'payroll.read'))
with check (private.has_org_permission_in_hierarchy(organization_id,'payroll.manage'));

drop policy if exists hr_employee_component_access on public.hr_employee_components;
create policy hr_employee_component_access on public.hr_employee_components for all to authenticated
using (exists(select 1 from public.hr_employees e join public.hr_payroll_components c on c.id=component_id where e.id=employee_id and e.organization_id=c.organization_id and (private.has_org_permission_in_hierarchy(e.organization_id,'payroll.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e join public.hr_payroll_components c on c.id=component_id where e.id=employee_id and e.organization_id=c.organization_id and private.has_org_permission_in_hierarchy(e.organization_id,'payroll.manage')));

drop policy if exists hr_leave_access on public.hr_leave_requests;
create policy hr_leave_access on public.hr_leave_requests for all to authenticated
using (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission_in_hierarchy(e.organization_id,'hr.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission_in_hierarchy(e.organization_id,'hr.leave.manage') or e.user_id=(select auth.uid()))));

drop policy if exists finance_account_access on public.finance_accounts;
create policy finance_account_access on public.finance_accounts for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'finance.read'))
with check (private.has_org_permission_in_hierarchy(organization_id,'finance.manage'));

drop policy if exists finance_entry_access on public.finance_journal_entries;
create policy finance_entry_access on public.finance_journal_entries for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'finance.read'))
with check (private.has_org_permission_in_hierarchy(organization_id,'finance.manage'));

drop policy if exists finance_line_access on public.finance_journal_lines;
create policy finance_line_access on public.finance_journal_lines for all to authenticated
using (exists(select 1 from public.finance_journal_entries e where e.id=journal_entry_id and private.has_org_permission_in_hierarchy(e.organization_id,'finance.read')))
with check (exists(select 1 from public.finance_journal_entries e where e.id=journal_entry_id and private.has_org_permission_in_hierarchy(e.organization_id,'finance.manage')));

drop policy if exists payroll_run_access on public.payroll_runs;
create policy payroll_run_access on public.payroll_runs for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'payroll.read'))
with check (private.has_org_permission_in_hierarchy(organization_id,'payroll.manage'));

drop policy if exists payroll_item_access on public.payroll_items;
create policy payroll_item_access on public.payroll_items for all to authenticated
using (exists(select 1 from public.payroll_runs r where r.id=payroll_run_id and private.has_org_permission_in_hierarchy(r.organization_id,'payroll.read')))
with check (exists(select 1 from public.payroll_runs r where r.id=payroll_run_id and private.has_org_permission_in_hierarchy(r.organization_id,'payroll.manage')));

drop policy if exists payroll_line_access on public.payroll_item_lines;
create policy payroll_line_access on public.payroll_item_lines for all to authenticated
using (exists(select 1 from public.payroll_items i join public.payroll_runs r on r.id=i.payroll_run_id where i.id=payroll_item_id and private.has_org_permission_in_hierarchy(r.organization_id,'payroll.read')))
with check (exists(select 1 from public.payroll_items i join public.payroll_runs r on r.id=i.payroll_run_id where i.id=payroll_item_id and private.has_org_permission_in_hierarchy(r.organization_id,'payroll.manage')));
