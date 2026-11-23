create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end;
$roles$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, organization_type text not null, parent_id uuid references public.organizations(id), is_active boolean not null default true, updated_at timestamptz not null default now());
create table public.roles (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null);
create table public.permissions (id uuid primary key default gen_random_uuid(), key text not null unique, name text, description text);
create table public.role_permissions (role_id uuid not null references public.roles(id), permission_id uuid not null references public.permissions(id), primary key (role_id, permission_id));
create table public.organization_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid not null, role_id uuid references public.roles(id), status text not null default 'ACTIVE');
create table public.organization_units (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, unit_type text not null default 'DEPARTMENT', is_active boolean not null default true, updated_at timestamptz not null default now());
create table public.ministries (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, status text not null default 'ACTIVE', updated_at timestamptz not null default now());
create table public.ministry_programs (id uuid primary key default gen_random_uuid(), ministry_id uuid not null references public.ministries(id), name text not null, status text not null default 'PLANNED', created_at timestamptz not null default now());
create table public.ministry_reports (id uuid primary key default gen_random_uuid(), ministry_id uuid not null references public.ministries(id), title text not null, status text not null default 'PENDING', submitted_at timestamptz not null default now());
create table public.church_member_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), first_name text not null, last_name text not null, membership_status text not null default 'ACTIVE', updated_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), actor_user_id uuid, action text not null, resource_type text not null, resource_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create or replace function private.is_verified_zion_global_admin() returns boolean language sql stable set search_path = pg_catalog, auth as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'zion_global_role' = 'global_admin' and auth.jwt() -> 'app_metadata' -> 'zion_verified' = 'true', false)
$$;
create or replace function private.has_org_permission_in_hierarchy(target_org uuid, permission_key text) returns boolean language sql stable security definer set search_path = pg_catalog, public, auth as $$
  with recursive ancestors(id, parent_id) as (
    select o.id, o.parent_id from public.organizations o where o.id = target_org
    union all
    select parent.id, parent.parent_id from public.organizations parent join ancestors child on child.parent_id = parent.id
  )
  select exists (
    select 1 from ancestors a
    join public.organization_memberships m on m.organization_id = a.id
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid() and m.status = 'ACTIVE' and p.key = permission_key
  )
$$;
grant usage on schema auth, private to authenticated;
grant execute on function auth.uid(), auth.jwt() to authenticated;
grant execute on function private.is_verified_zion_global_admin(), private.has_org_permission_in_hierarchy(uuid, text) to authenticated;
insert into public.roles(key, name) values ('secretary', 'Secretary');
