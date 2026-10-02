-- Administration and ministry operational foundation.
create extension if not exists pgcrypto;

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  department text not null default 'MINISTRY',
  philosophy text not null default '',
  description text not null default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ministries_org_idx on public.ministries(organization_id, status, name);

create table if not exists public.ministry_leaders (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(ministry_id, user_id)
);
create index if not exists ministry_leaders_ministry_idx on public.ministry_leaders(ministry_id);

create table if not exists public.ministry_programs (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'PLANNED' check (status in ('ACTIVE','COMPLETED','PLANNED')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);
create index if not exists ministry_programs_ministry_idx on public.ministry_programs(ministry_id, status);

create table if not exists public.ministry_members (
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  joined_at timestamptz not null default now(),
  primary key (ministry_id, user_id)
);

create table if not exists public.ministry_reports (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  title text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  submitted_at timestamptz not null default now(),
  submitted_by uuid references auth.users(id) on delete set null
);
create index if not exists ministry_reports_ministry_idx on public.ministry_reports(ministry_id, submitted_at desc);

alter table public.ministries enable row level security;
alter table public.ministry_leaders enable row level security;
alter table public.ministry_programs enable row level security;
alter table public.ministry_members enable row level security;
alter table public.ministry_reports enable row level security;

drop policy if exists ministries_member_read on public.ministries;
create policy ministries_member_read on public.ministries for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists ministry_leaders_member_read on public.ministry_leaders;
create policy ministry_leaders_member_read on public.ministry_leaders for select to authenticated using (exists (select 1 from public.ministries m where m.id = ministry_id and private.is_org_member(m.organization_id)));
drop policy if exists ministry_programs_member_read on public.ministry_programs;
create policy ministry_programs_member_read on public.ministry_programs for select to authenticated using (exists (select 1 from public.ministries m where m.id = ministry_id and private.is_org_member(m.organization_id)));
drop policy if exists ministry_members_member_read on public.ministry_members;
create policy ministry_members_member_read on public.ministry_members for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.ministries m where m.id = ministry_id and private.has_org_permission(m.organization_id, 'membership.read')));
drop policy if exists ministry_reports_member_read on public.ministry_reports;
create policy ministry_reports_member_read on public.ministry_reports for select to authenticated using (exists (select 1 from public.ministries m where m.id = ministry_id and private.is_org_member(m.organization_id)));
