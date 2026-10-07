-- ZION OS Human Resources + Payroll + Finance foundation.
-- HR is distinct from Administration. Payroll is a controlled financial subdomain.
-- Amounts are stored as numeric(18,2); calculation rules remain configurable.
create extension if not exists pgcrypto;

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  employee_number text not null,
  legal_first_name text not null,
  legal_last_name text not null,
  preferred_name text,
  national_id text,
  tax_id text,
  social_security_number text,
  date_of_birth date,
  hire_date date not null,
  termination_date date,
  employment_status text not null default 'ACTIVE' check (employment_status in ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED')),
  employment_type text not null default 'FULL_TIME' check (employment_type in ('FULL_TIME','PART_TIME','CONTRACTOR','VOLUNTEER')),
  job_title text not null,
  department_unit_id uuid references public.organization_units(id) on delete set null,
  manager_employee_id uuid references public.hr_employees(id) on delete set null,
  country_code text not null default 'AO',
  currency_code text not null default 'AOA',
  work_email text,
  work_phone text,
  address jsonb not null default '{}'::jsonb,
  emergency_contact jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_number)
);

create index if not exists hr_employees_org_status_idx on public.hr_employees(organization_id, employment_status);
create index if not exists hr_employees_user_idx on public.hr_employees(user_id);
create index if not exists hr_employees_unit_idx on public.hr_employees(department_unit_id);

create table if not exists public.hr_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  contract_number text not null,
  contract_type text not null,
  start_date date not null,
  end_date date,
  base_salary numeric(18,2) not null default 0 check (base_salary >= 0),
  currency_code text not null default 'AOA',
  pay_frequency text not null default 'MONTHLY' check (pay_frequency in ('MONTHLY','BIWEEKLY','WEEKLY')),
  probation_end_date date,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','EXPIRED','TERMINATED')),
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, contract_number)
);

create index if not exists hr_contracts_employee_idx on public.hr_contracts(employee_id, status);

create table if not exists hr_payroll_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  component_type text not null check (component_type in ('EARNING','DEDUCTION','EMPLOYER_CONTRIBUTION')),
  calculation_type text not null check (calculation_type in ('FIXED','PERCENTAGE','FORMULA')),
  rate numeric(18,6),
  taxable boolean not null default false,
  pensionable boolean not null default false,
  formula text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table if not exists public.hr_employee_components (
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  component_id uuid not null references public.hr_payroll_components(id) on delete restrict,
  amount numeric(18,2) not null default 0,
  rate numeric(18,6),
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  primary key(employee_id, component_id, effective_from)
);

create table if not exists public.hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check(end_date >= start_date)
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  currency_code text not null default 'AOA',
  parent_account_id uuid references public.finance_accounts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table if not exists public.finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entry_number bigint generated always as identity,
  entry_date date not null default current_date,
  description text not null,
  source_type text not null default 'MANUAL',
  source_id uuid,
  status text not null default 'POSTED' check (status in ('DRAFT','POSTED','VOID')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  description text,
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists finance_accounts_org_idx on public.finance_accounts(organization_id);
create index if not exists finance_journal_org_date_idx on public.finance_journal_entries(organization_id, entry_date desc);
create index if not exists finance_journal_lines_entry_idx on public.finance_journal_lines(journal_entry_id);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  pay_date date,
  currency_code text not null default 'AOA',
  status text not null default 'DRAFT' check (status in ('DRAFT','CALCULATING','REVIEW','APPROVED','PAID','VOID')),
  gross_total numeric(18,2) not null default 0,
  deduction_total numeric(18,2) not null default 0,
  employer_contribution_total numeric(18,2) not null default 0,
  net_total numeric(18,2) not null default 0,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id, period_start, period_end)
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  gross_amount numeric(18,2) not null default 0,
  deduction_amount numeric(18,2) not null default 0,
  employer_contribution_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  currency_code text not null default 'AOA',
  status text not null default 'CALCULATED' check (status in ('CALCULATED','ADJUSTED','PAID','VOID')),
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(payroll_run_id, employee_id)
);

create table if not exists public.payroll_item_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references public.payroll_items(id) on delete cascade,
  component_id uuid references public.hr_payroll_components(id) on delete restrict,
  line_type text not null check (line_type in ('EARNING','DEDUCTION','EMPLOYER_CONTRIBUTION')),
  description text not null,
  amount numeric(18,2) not null default 0,
  rate numeric(18,6),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists payroll_runs_org_period_idx on public.payroll_runs(organization_id, period_end desc);
create index if not exists payroll_items_employee_idx on public.payroll_items(employee_id);
create index if not exists payroll_item_lines_item_idx on public.payroll_item_lines(payroll_item_id);

-- Permissions: HR and payroll are separate from generic administration.
insert into public.permissions(key,name,description)
values
 ('hr.read','HR — Read','View employee and HR records'),
 ('hr.manage','HR — Manage','Create and manage employee records'),
 ('hr.contract.manage','HR — Contracts','Manage employment contracts'),
 ('hr.leave.manage','HR — Leave','Approve and manage leave'),
 ('payroll.read','Payroll — Read','View payroll runs and payslips'),
 ('payroll.manage','Payroll — Manage','Calculate and prepare payroll'),
 ('payroll.approve','Payroll — Approve','Approve payroll for payment'),
 ('finance.read','Finance — Read','View finance records'),
 ('finance.manage','Finance — Manage','Manage finance accounts and journal entries')
on conflict(key) do update set name=excluded.name,description=excluded.description;

insert into public.roles(key,name,description,is_system)
values
 ('hr_manager','HR Manager','Human Resources management',true),
 ('payroll_manager','Payroll Manager','Payroll preparation and calculation',true),
 ('finance_manager','Finance Manager','Financial operations and accounting',true)
on conflict(key) do update set name=excluded.name,description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r
cross join public.permissions p
where (r.key='hr_manager' and p.key in ('hr.read','hr.manage','hr.contract.manage','hr.leave.manage'))
   or (r.key='payroll_manager' and p.key in ('hr.read','payroll.read','payroll.manage'))
   or (r.key='finance_manager' and p.key in ('finance.read','finance.manage','payroll.read','payroll.approve'))
on conflict do nothing;

-- Organization administrators/leaders retain oversight, but HR/payroll access is explicit.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r
cross join public.permissions p
where r.key in ('organization_admin','organization_leader')
  and p.key in ('hr.read','payroll.read','finance.read')
on conflict do nothing;

-- Sensitive domains: no anonymous access; authenticated access is always constrained by org permissions.
alter table public.hr_employees enable row level security;
alter table public.hr_contracts enable row level security;
alter table public.hr_payroll_components enable row level security;
alter table public.hr_employee_components enable row level security;
alter table public.hr_leave_requests enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.payroll_item_lines enable row level security;

revoke all on public.hr_employees,public.hr_contracts,public.hr_payroll_components,public.hr_employee_components,public.hr_leave_requests,public.finance_accounts,public.finance_journal_entries,public.finance_journal_lines,public.payroll_runs,public.payroll_items,public.payroll_item_lines from anon;
grant select,insert,update on public.hr_employees,public.hr_contracts,public.hr_payroll_components,public.hr_employee_components,public.hr_leave_requests to authenticated;
grant select,insert,update on public.finance_accounts,public.finance_journal_entries,public.finance_journal_lines to authenticated;
grant select,insert,update on public.payroll_runs,public.payroll_items,public.payroll_item_lines to authenticated;

drop policy if exists hr_employee_access on public.hr_employees;
create policy hr_employee_access on public.hr_employees for all to authenticated
using (private.has_org_permission(organization_id,'hr.read') or user_id=(select auth.uid()))
with check (private.has_org_permission(organization_id,'hr.manage'));

drop policy if exists hr_contract_access on public.hr_contracts;
create policy hr_contract_access on public.hr_contracts for all to authenticated
using (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission(e.organization_id,'hr.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e where e.id=employee_id and private.has_org_permission(e.organization_id,'hr.contract.manage')));

drop policy if exists hr_component_access on public.hr_payroll_components;
create policy hr_component_access on public.hr_payroll_components for all to authenticated
using (private.has_org_permission(organization_id,'payroll.read'))
with check (private.has_org_permission(organization_id,'payroll.manage'));

drop policy if exists hr_employee_component_access on public.hr_employee_components;
create policy hr_employee_component_access on public.hr_employee_components for all to authenticated
using (exists(select 1 from public.hr_employees e join public.hr_payroll_components c on c.id=component_id where e.id=employee_id and e.organization_id=c.organization_id and (private.has_org_permission(e.organization_id,'payroll.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e join public.hr_payroll_components c on c.id=component_id where e.id=employee_id and e.organization_id=c.organization_id and private.has_org_permission(e.organization_id,'payroll.manage')));

drop policy if exists hr_leave_access on public.hr_leave_requests;
create policy hr_leave_access on public.hr_leave_requests for all to authenticated
using (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission(e.organization_id,'hr.read') or e.user_id=(select auth.uid()))))
with check (exists(select 1 from public.hr_employees e where e.id=employee_id and (private.has_org_permission(e.organization_id,'hr.leave.manage') or e.user_id=(select auth.uid()))));

drop policy if exists finance_account_access on public.finance_accounts;
create policy finance_account_access on public.finance_accounts for all to authenticated
using (private.has_org_permission(organization_id,'finance.read'))
with check (private.has_org_permission(organization_id,'finance.manage'));

drop policy if exists finance_entry_access on public.finance_journal_entries;
create policy finance_entry_access on public.finance_journal_entries for all to authenticated
using (private.has_org_permission(organization_id,'finance.read'))
with check (private.has_org_permission(organization_id,'finance.manage'));

drop policy if exists finance_line_access on public.finance_journal_lines;
create policy finance_line_access on public.finance_journal_lines for all to authenticated
using (exists(select 1 from public.finance_journal_entries e where e.id=journal_entry_id and private.has_org_permission(e.organization_id,'finance.read')))
with check (exists(select 1 from public.finance_journal_entries e where e.id=journal_entry_id and private.has_org_permission(e.organization_id,'finance.manage')));

drop policy if exists payroll_run_access on public.payroll_runs;
create policy payroll_run_access on public.payroll_runs for all to authenticated
using (private.has_org_permission(organization_id,'payroll.read'))
with check (private.has_org_permission(organization_id,'payroll.manage'));

drop policy if exists payroll_item_access on public.payroll_items;
create policy payroll_item_access on public.payroll_items for all to authenticated
using (exists(select 1 from public.payroll_runs r where r.id=payroll_run_id and private.has_org_permission(r.organization_id,'payroll.read')))
with check (exists(select 1 from public.payroll_runs r where r.id=payroll_run_id and private.has_org_permission(r.organization_id,'payroll.manage')));

drop policy if exists payroll_line_access on public.payroll_item_lines;
create policy payroll_line_access on public.payroll_item_lines for all to authenticated
using (exists(select 1 from public.payroll_items i join public.payroll_runs r on r.id=i.payroll_run_id where i.id=payroll_item_id and private.has_org_permission(r.organization_id,'payroll.read')))
with check (exists(select 1 from public.payroll_items i join public.payroll_runs r on r.id=i.payroll_run_id where i.id=payroll_item_id and private.has_org_permission(r.organization_id,'payroll.manage')));

-- Payroll integrity: every posted journal entry must balance.
create or replace function private.finance_journal_entry_balanced(p_entry uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select sum(debit)=sum(credit) from public.finance_journal_lines where journal_entry_id=p_entry),false);
$$;

create or replace function public.validate_finance_journal_entry()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status='POSTED' and not private.finance_journal_entry_balanced(new.id) then
    raise exception 'finance_journal_entry_not_balanced';
  end if;
  return new;
end;
$$;

drop trigger if exists finance_journal_entry_balance on public.finance_journal_entries;
create constraint trigger finance_journal_entry_balance
after insert or update on public.finance_journal_entries
deferrable initially deferred
for each row execute function public.validate_finance_journal_entry();
