create schema if not exists auth;
create schema if not exists private;
create role anon;
create role authenticated;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.jwt()
returns jsonb language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type text not null default 'LOCAL_CHURCH',
  parent_id uuid references public.organizations(id) on delete set null,
  created_by uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'ACTIVE'
);

create or replace function private.has_org_permission_in_hierarchy(target_org uuid, permission_key text)
returns boolean language sql stable
as $$ select true $$;

create table public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid
);
alter table public.hr_employees enable row level security;
create policy hr_employees_insert on public.hr_employees
for insert to authenticated
with check (private.has_org_permission_in_hierarchy(organization_id, 'hr.manage'::text));
create policy hr_employees_select on public.hr_employees
for select to authenticated
using (private.has_org_permission_in_hierarchy(organization_id, 'hr.read'::text) or user_id = auth.uid());

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id)
);
alter table public.payroll_runs enable row level security;
create policy payroll_runs_insert on public.payroll_runs
for insert to authenticated
with check (private.has_org_permission_in_hierarchy(organization_id, 'payroll.manage'::text));

grant select, insert on public.hr_employees, public.payroll_runs to authenticated;
