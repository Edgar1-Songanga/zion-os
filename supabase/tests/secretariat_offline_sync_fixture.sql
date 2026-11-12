\set ON_ERROR_STOP on
create extension if not exists pgcrypto;
create schema auth;
create schema private;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function private.has_org_permission(target_org uuid, permission_key text)
returns boolean language sql stable
as $$ select target_org is not null and permission_key = 'church.members.manage' $$;

create table public.organizations (id uuid primary key, name text not null);
create table public.church_member_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
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
  constraint church_member_records_status_check
    check (membership_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE', 'REMOVED'))
);
alter table public.church_member_records enable row level security;
create policy church_member_records_read on public.church_member_records
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.manage'));
create policy church_member_records_insert on public.church_member_records
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy church_member_records_update on public.church_member_records
for update to authenticated
using (private.has_org_permission(organization_id, 'church.members.manage'))
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and updated_by = (select auth.uid())
);

insert into auth.users values ('11111111-1111-4111-8111-111111111111');
insert into public.organizations values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Church');
grant usage on schema public, private, auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant select, insert, update on public.church_member_records to authenticated;
