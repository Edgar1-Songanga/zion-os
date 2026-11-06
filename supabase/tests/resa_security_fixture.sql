\set ON_ERROR_STOP on

create schema if not exists auth;
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function private.has_org_permission(p_organization_id uuid, p_permission text)
returns boolean language sql stable
as $$
  select nullif(current_setting('test.zion_manager_org', true), '') = p_organization_id::text
$$;

create table public.resa_live_sessions (
  id uuid primary key,
  host_id uuid not null references auth.users(id),
  visibility text not null,
  status text not null,
  password_hash text
);

create table public.resa_live_access_grants (
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (live_id, user_id)
);

create table public.organizations (id uuid primary key);
create table public.ministries (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  department text not null
);
create table public.ministry_leaders (
  ministry_id uuid not null references public.ministries(id),
  user_id uuid not null references auth.users(id),
  primary key (ministry_id, user_id)
);
create table public.sabbath_school_classes (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  ministry_id uuid not null references public.ministries(id),
  teacher_user_id uuid references auth.users(id)
);
create table public.sabbath_school_attendance_sessions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  class_id uuid not null references public.sabbath_school_classes(id),
  expires_at timestamptz not null
);
create table public.sabbath_school_attendance (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  session_id uuid not null references public.sabbath_school_attendance_sessions(id),
  expires_at timestamptz not null
);
create table public.sabbath_school_class_members (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  class_id uuid not null references public.sabbath_school_classes(id),
  expires_at timestamptz not null
);
create table public.personal_ministry_follow_ups (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  ministry_id uuid not null references public.ministries(id),
  assigned_to uuid not null references auth.users(id),
  expires_at timestamptz not null
);
