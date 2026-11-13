-- Minimal disposable schema for the payroll RPC regression. Never run against production.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists private;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function private.has_org_permission_in_hierarchy(uuid, text)
returns boolean language sql stable as $$ select true $$;

create table public.payroll_runs (
  id uuid primary key,
  organization_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null,
  currency_code text not null,
  gross_total numeric(18,2) not null default 0,
  deduction_total numeric(18,2) not null default 0,
  employer_contribution_total numeric(18,2) not null default 0,
  net_total numeric(18,2) not null default 0
);
create table public.hr_employees (
  id uuid primary key,
  organization_id uuid not null,
  employee_number text not null,
  employment_status text not null,
  currency_code text not null
);
create table public.hr_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id),
  status text not null,
  start_date date not null,
  end_date date,
  currency_code text not null,
  base_salary numeric(18,2) not null
);
create table public.hr_payroll_components (
  id uuid primary key,
  organization_id uuid not null,
  is_active boolean not null,
  component_type text not null,
  calculation_type text not null,
  rate numeric(18,4)
);
create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id),
  employee_id uuid not null references public.hr_employees(id),
  gross_amount numeric(18,2) not null,
  deduction_amount numeric(18,2) not null,
  employer_contribution_amount numeric(18,2) not null,
  net_amount numeric(18,2) not null,
  currency_code text not null,
  calculation_snapshot jsonb not null default '{}'::jsonb
);
create table public.payroll_item_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references public.payroll_items(id),
  component_id uuid,
  line_type text not null,
  description text not null,
  amount numeric(18,2) not null,
  rate numeric(18,4)
);
grant usage on schema public, auth, private to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.has_org_permission_in_hierarchy(uuid, text) to authenticated;
