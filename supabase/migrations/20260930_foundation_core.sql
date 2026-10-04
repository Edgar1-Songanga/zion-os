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

-- Security-definer helpers centralize organization authorization for RLS.
-- They execute with a controlled search path and are callable only by authenticated users.
create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'ACTIVE'
  );
$$;

create or replace function private.has_org_permission(target_organization_id uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.created_by = (select auth.uid())
  ) or exists (
    select 1
    from public.organization_memberships membership
    join public.role_permissions role_permission on role_permission.role_id = membership.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'ACTIVE'
      and permission.key = required_permission
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_permission(uuid, text) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;

-- RLS and policy definitions are maintained with the live foundation setup.
-- This file is the versioned source snapshot and should be updated alongside future migrations.


-- Identity bootstrap RLS
create policy "memberships_insert_owner_bootstrap"
on public.organization_memberships
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.created_by = (select auth.uid())
  )
);

create policy "audit_insert_actor"
on public.audit_logs
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (
    organization_id is null
    or private.is_org_member(organization_id)
  )
);


-- Organization unit membership management
create policy "unit_memberships_insert_admin"
on public.unit_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_units u
    join public.organization_memberships m on m.organization_id = u.organization_id
    where u.id = unit_memberships.unit_id
      and m.id = unit_memberships.membership_id
      and private.has_org_permission(u.organization_id, 'membership.manage')
  )
);

create policy "unit_memberships_delete_admin"
on public.unit_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_units u
    where u.id = unit_memberships.unit_id
      and private.has_org_permission(u.organization_id, 'membership.manage')
  )
);

create policy "unit_memberships_update_admin"
on public.unit_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_units u
    where u.id = unit_memberships.unit_id
      and private.has_org_permission(u.organization_id, 'membership.manage')
  )
)
with check (
  exists (
    select 1
    from public.organization_units u
    where u.id = unit_memberships.unit_id
      and private.has_org_permission(u.organization_id, 'membership.manage')
  )
);

create index if not exists idx_unit_memberships_unit
on public.unit_memberships(unit_id);


-- Governance core
create table if not exists public.governance_councils (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 unit_id uuid references public.organization_units(id) on delete set null, name text not null, description text,
 quorum_type text not null default 'MAJORITY_PRESENT', quorum_value integer not null default 50,
 is_active boolean not null default true, created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.governance_council_members (
 id uuid primary key default gen_random_uuid(), council_id uuid not null references public.governance_councils(id) on delete cascade,
 membership_id uuid not null references public.organization_memberships(id) on delete cascade,
 member_role text not null default 'MEMBER', is_voting_member boolean not null default true,
 status text not null default 'ACTIVE', created_at timestamptz not null default now(), unique(council_id,membership_id)
);
create table if not exists public.governance_meetings (
 id uuid primary key default gen_random_uuid(), council_id uuid not null references public.governance_councils(id) on delete cascade,
 title text not null, description text, scheduled_at timestamptz not null, started_at timestamptz, ended_at timestamptz,
 status text not null default 'SCHEDULED', visibility text not null default 'PRIVATE',
 host_user_id uuid references auth.users(id) on delete set null, recording_url text,
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.governance_agenda_items (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.governance_meetings(id) on delete cascade,
 position integer not null, title text not null, description text, item_type text not null default 'DISCUSSION',
 created_at timestamptz not null default now(), unique(meeting_id,position)
);
create table if not exists public.governance_motions (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.governance_meetings(id) on delete cascade,
 agenda_item_id uuid references public.governance_agenda_items(id) on delete set null,
 proposed_by_membership_id uuid references public.organization_memberships(id) on delete set null,
 title text not null, body text not null, status text not null default 'OPEN',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.governance_votes (
 id uuid primary key default gen_random_uuid(), motion_id uuid not null references public.governance_motions(id) on delete cascade,
 council_member_id uuid not null references public.governance_council_members(id) on delete cascade,
 choice text not null, cast_at timestamptz not null default now(), unique(motion_id,council_member_id)
);
create table if not exists public.governance_decisions (
 id uuid primary key default gen_random_uuid(), motion_id uuid not null unique references public.governance_motions(id) on delete cascade,
 outcome text not null, yes_count integer not null default 0, no_count integer not null default 0,
 abstain_count integer not null default 0, quorum_met boolean not null default false,
 decided_at timestamptz not null default now(), decided_by uuid references auth.users(id) on delete set null
);
create table if not exists public.governance_minutes (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null unique references public.governance_meetings(id) on delete cascade,
 status text not null default 'DRAFT', content text, approved_at timestamptz,
 approved_by uuid references auth.users(id) on delete set null,
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_gov_councils_org on public.governance_councils(organization_id);
create index if not exists idx_gov_council_members_council on public.governance_council_members(council_id);
create index if not exists idx_gov_meetings_council_time on public.governance_meetings(council_id,scheduled_at);
create index if not exists idx_gov_agenda_meeting on public.governance_agenda_items(meeting_id,position);
create index if not exists idx_gov_motions_meeting on public.governance_motions(meeting_id);
create index if not exists idx_gov_votes_motion on public.governance_votes(motion_id);
create index if not exists idx_gov_minutes_meeting on public.governance_minutes(meeting_id);
