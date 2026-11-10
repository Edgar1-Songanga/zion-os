create role anon nologin;
create role authenticated nologin;

create schema auth;
create schema private;

create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.organizations (
  id uuid primary key,
  name text not null,
  organization_type text not null,
  is_active boolean not null default true
);

create table public.ministries (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  unique (id, organization_id)
);

create table public.sabbath_school_classes (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid,
  name text not null,
  meeting_day smallint not null,
  meeting_time time,
  room_label text,
  is_active boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.youth_club_activities (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  activity_type text not null,
  status text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
