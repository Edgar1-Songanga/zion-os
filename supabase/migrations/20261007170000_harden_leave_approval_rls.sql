-- Prevent employees from approving or rejecting their own leave requests.
-- Self-service remains limited to SELECT/INSERT; status changes require hr.leave.manage.

drop policy if exists "hr_leave_access" on public.hr_leave_requests;

create policy "hr_leave_select"
on public.hr_leave_requests
for select
to authenticated
using (
  exists (
    select 1 from public.hr_employees e
    where e.id = hr_leave_requests.employee_id
      and (private.has_org_permission_in_hierarchy(e.organization_id, 'hr.read') or e.user_id = (select auth.uid()))
  )
);

create policy "hr_leave_insert"
on public.hr_leave_requests
for insert
to authenticated
with check (
  exists (
    select 1 from public.hr_employees e
    where e.id = hr_leave_requests.employee_id
      and (private.has_org_permission_in_hierarchy(e.organization_id, 'hr.leave.manage') or e.user_id = (select auth.uid()))
  )
);

create policy "hr_leave_update_manager"
on public.hr_leave_requests
for update
to authenticated
using (
  exists (
    select 1 from public.hr_employees e
    where e.id = hr_leave_requests.employee_id
      and private.has_org_permission_in_hierarchy(e.organization_id, 'hr.leave.manage')
  )
)
with check (
  exists (
    select 1 from public.hr_employees e
    where e.id = hr_leave_requests.employee_id
      and private.has_org_permission_in_hierarchy(e.organization_id, 'hr.leave.manage')
  )
);
