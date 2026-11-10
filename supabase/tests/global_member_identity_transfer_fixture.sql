create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;
do $$ begin
  create role anon;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated;
exception when duplicate_object then null; end $$;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function private.has_org_permission(target_org uuid, permission_key text)
returns boolean language sql stable
as $$ select true $$;
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
create table public.church_member_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_number text,
  first_name text not null,
  last_name text not null,
  birth_date date,
  gender text,
  phone text,
  email text,
  address text,
  baptism_date date,
  membership_status text not null default 'ACTIVE',
  joined_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, member_number)
);
create table public.church_member_transfers (
  id uuid primary key default gen_random_uuid(),
  member_record_id uuid not null,
  origin_organization_id uuid not null references public.organizations(id),
  destination_organization_id uuid not null references public.organizations(id),
  status text not null default 'DRAFT',
  request_date date not null default current_date,
  reason text,
  document_reference text,
  requested_by uuid not null references auth.users(id),
  submitted_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (member_record_id, origin_organization_id)
    references public.church_member_records(id, organization_id) on delete restrict
);
