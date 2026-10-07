alter table public.hr_contracts add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.hr_leave_requests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.payroll_runs add column if not exists journal_entry_id uuid references public.finance_journal_entries(id) on delete set null;
create table if not exists public.hr_employee_documents (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.hr_employees(id) on delete cascade,
 document_type text not null,
 document_number text,
 storage_path text,
 issued_at date,
 expires_at date,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','EXPIRED','REVOKED')),
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists hr_employee_documents_employee_idx on public.hr_employee_documents(employee_id);
alter table public.hr_employee_documents enable row level security;
revoke all on public.hr_employee_documents from anon;
grant select,insert,update on public.hr_employee_documents to authenticated;
create policy hr_employee_documents_access on public.hr_employee_documents for all to authenticated
using (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission_in_hierarchy(e.organization_id,'hr.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e where e.id=employee_id and private.has_org_permission_in_hierarchy(e.organization_id,'hr.manage')));
create index if not exists payroll_runs_journal_idx on public.payroll_runs(journal_entry_id);