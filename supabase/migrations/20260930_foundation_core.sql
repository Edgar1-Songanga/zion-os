-- ZION OS foundation core
-- Applied to the ZION Supabase project during foundation setup.
-- Supabase Auth remains the identity authority.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  bio text,
  country_code text,
  locale text not null default 'pt',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type text not null default 'LOCAL_CHURCH',
  parent_id uuid references public.organizations(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_units (
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

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  status text not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.unit_memberships (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.organization_units(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (unit_id, membership_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_parent on public.organizations(parent_id);
create index if not exists idx_units_org on public.organization_units(organization_id);
create index if not exists idx_units_parent on public.organization_units(parent_id);
create index if not exists idx_memberships_user on public.organization_memberships(user_id);
create index if not exists idx_memberships_org on public.organization_memberships(organization_id);
create index if not exists idx_memberships_role on public.organization_memberships(role_id);
create index if not exists idx_unit_memberships_membership on public.unit_memberships(membership_id);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_actor_created on public.audit_logs(actor_user_id, created_at desc);
create index if not exists idx_organizations_created_by on public.organizations(created_by);
create index if not exists idx_role_permissions_permission on public.role_permissions(permission_id);

-- RLS and policy definitions are maintained with the live foundation setup.
-- This file is the versioned source snapshot and should be updated alongside future migrations.
