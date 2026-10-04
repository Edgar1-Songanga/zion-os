-- ZION finance and payroll foundation.
-- Amounts are integer minor units (for example cents) to avoid floating-point errors.
create table if not exists public.finance_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donor_user_id uuid references auth.users(id) on delete set null,
  contribution_type text not null check (contribution_type in ('DONATION','TITHE','OFFERING')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  payment_method text not null default 'OFFLINE' check (payment_method in ('OFFLINE','BANK_TRANSFER','CARD','MOBILE_MONEY','CASH')),
  status text not null default 'PENDING' check (status in ('PENDING','RECEIVED','REFUNDED','CANCELLED')),
  occurred_on date not null default current_date,
  external_reference text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_contributions_org_date_idx on public.finance_contributions(organization_id, occurred_on desc);

create table if not exists public.finance_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  legal_name text not null,
  employee_number text not null,
  department text,
  pay_frequency text not null default 'MONTHLY' check (pay_frequency in ('MONTHLY','BIWEEKLY','WEEKLY')),
  base_salary_minor bigint not null check (base_salary_minor >= 0),
  currency char(3) not null,
  payment_method text not null default 'BANK_TRANSFER' check (payment_method in ('BANK_TRANSFER','MOBILE_MONEY','CASH')),
  payment_account_last4 text,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, employee_number)
);
create index if not exists finance_staff_org_active_idx on public.finance_staff(organization_id, active, legal_name);

create table if not exists public.finance_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  currency char(3) not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','PROCESSING','PAID','CANCELLED')),
  total_gross_minor bigint not null default 0 check (total_gross_minor >= 0),
  total_deductions_minor bigint not null default 0 check (total_deductions_minor >= 0),
  total_net_minor bigint not null default 0 check (total_net_minor >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  external_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (total_net_minor = total_gross_minor - total_deductions_minor)
);
create index if not exists finance_payroll_runs_org_date_idx on public.finance_payroll_runs(organization_id, period_end desc);

create table if not exists public.finance_payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.finance_payroll_runs(id) on delete cascade,
  staff_id uuid not null references public.finance_staff(id) on delete restrict,
  gross_minor bigint not null check (gross_minor >= 0),
  deductions_minor bigint not null default 0 check (deductions_minor >= 0),
  net_minor bigint generated always as (gross_minor - deductions_minor) stored,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','PAID','FAILED')),
  payslip_number text not null,
  paid_at timestamptz,
  external_reference text,
  notes text,
  created_at timestamptz not null default now(),
  unique(payroll_run_id, staff_id),
  check (gross_minor >= deductions_minor)
);
create index if not exists finance_payroll_items_run_idx on public.finance_payroll_items(payroll_run_id);

insert into public.permissions (key, name, description)
values
  ('finance.manage', 'Manage finance', 'Record contributions and maintain finance records'),
  ('payroll.manage', 'Manage payroll', 'Manage staff compensation, payroll runs and settlement records')
on conflict (key) do nothing;

alter table public.finance_contributions enable row level security;
alter table public.finance_staff enable row level security;
alter table public.finance_payroll_runs enable row level security;
alter table public.finance_payroll_items enable row level security;

drop policy if exists finance_contributions_org_read on public.finance_contributions;
create policy finance_contributions_org_read on public.finance_contributions for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists finance_contributions_manage on public.finance_contributions;
create policy finance_contributions_manage on public.finance_contributions for all to authenticated using (private.has_org_permission(organization_id, 'finance.manage')) with check (private.has_org_permission(organization_id, 'finance.manage') and created_by = (select auth.uid()));

drop policy if exists finance_staff_org_read on public.finance_staff;
create policy finance_staff_org_read on public.finance_staff for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists finance_staff_manage on public.finance_staff;
create policy finance_staff_manage on public.finance_staff for all to authenticated using (private.has_org_permission(organization_id, 'payroll.manage')) with check (private.has_org_permission(organization_id, 'payroll.manage') and created_by = (select auth.uid()));

drop policy if exists finance_payroll_runs_org_read on public.finance_payroll_runs;
create policy finance_payroll_runs_org_read on public.finance_payroll_runs for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists finance_payroll_runs_manage on public.finance_payroll_runs;
create policy finance_payroll_runs_manage on public.finance_payroll_runs for all to authenticated using (private.has_org_permission(organization_id, 'payroll.manage')) with check (private.has_org_permission(organization_id, 'payroll.manage') and created_by = (select auth.uid()));

drop policy if exists finance_payroll_items_org_read on public.finance_payroll_items;
create policy finance_payroll_items_org_read on public.finance_payroll_items for select to authenticated using (exists (select 1 from public.finance_payroll_runs run where run.id = payroll_run_id and private.is_org_member(run.organization_id)));
drop policy if exists finance_payroll_items_manage on public.finance_payroll_items;
create policy finance_payroll_items_manage on public.finance_payroll_items for all to authenticated using (exists (select 1 from public.finance_payroll_runs run where run.id = payroll_run_id and private.has_org_permission(run.organization_id, 'payroll.manage'))) with check (exists (select 1 from public.finance_payroll_runs run where run.id = payroll_run_id and private.has_org_permission(run.organization_id, 'payroll.manage')));
