create schema if not exists auth;
create schema if not exists private;
create role anon;
create role authenticated;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.jwt()
returns jsonb language sql stable
as $function$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $function$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function auth.jwt() to authenticated;

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
  status text not null default 'ACTIVE',
  role_id uuid
);

create table public.roles (id uuid primary key default gen_random_uuid(), key text not null unique);
create table public.permissions (id uuid primary key default gen_random_uuid(), key text not null unique);
create table public.role_permissions (role_id uuid not null references public.roles(id), permission_id uuid not null references public.permissions(id), primary key(role_id, permission_id));

create or replace function private.is_org_member(target_org uuid)
returns boolean language sql stable
as $function$ select exists (select 1 from public.organization_memberships m where m.organization_id=target_org and m.user_id=auth.uid() and m.status='ACTIVE') $function$;

create or replace function private.has_org_permission(target_org uuid, permission_key text)
returns boolean language sql stable
as $function$ select exists (
  select 1 from public.organization_memberships m
  join public.role_permissions rp on rp.role_id=m.role_id
  join public.permissions p on p.id=rp.permission_id
  where m.organization_id=target_org and m.user_id=auth.uid() and m.status='ACTIVE' and p.key=permission_key
) $function$;

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.organization_units(id) on delete set null,
  name text not null,
  unit_type text not null default 'DEPARTMENT',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
grant select on public.organizations to authenticated;

alter table public.organization_units enable row level security;
create policy units_select_member on public.organization_units
for select to authenticated
using (private.is_org_member(organization_id));
create policy units_insert_admin on public.organization_units
for insert to authenticated
with check (private.has_org_permission(organization_id, 'organization.manage'));
create policy units_update_admin on public.organization_units
for update to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage'));
create policy units_delete_admin on public.organization_units
for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

grant select, insert, update, delete on public.organization_units to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
