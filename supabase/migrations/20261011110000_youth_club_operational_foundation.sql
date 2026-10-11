-- Persistent Youth Ministry clubs and membership foundation.
-- Organization-scoped and additive; existing ministry and youth UI structures remain intact.

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ministries_id_organization_id_unique'
      and conrelid = 'public.ministries'::regclass
  ) then
    alter table public.ministries
      add constraint ministries_id_organization_id_unique unique (id, organization_id);
  end if;
end $;

create table if not exists public.youth_clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid,
  name text not null check (length(trim(name)) between 2 and 160),
  program_id text not null check (program_id in (
    'adventurers',
    'pathfinders',
    'ambassadors',
    'young-adults',
    'public-campus-ministries'
  )),
  motto text not null default '',
  description text not null default '',
  logo_url text,
  cover_image_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_clubs_ministry_organization_fk
    foreign key (ministry_id, organization_id)
    references public.ministries(id, organization_id)
    on delete restrict,
  constraint youth_clubs_org_name_unique unique (organization_id, name)
);

create index if not exists youth_clubs_org_program_idx
  on public.youth_clubs(organization_id, program_id, status, name);

create table if not exists public.youth_club_members (
  club_id uuid not null references public.youth_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists youth_club_members_user_idx
  on public.youth_club_members(user_id, status);

create table if not exists public.youth_club_leaders (
  club_id uuid not null references public.youth_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (length(trim(role)) between 2 and 120),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists youth_club_leaders_user_idx
  on public.youth_club_leaders(user_id);

alter table public.youth_clubs enable row level security;
alter table public.youth_club_members enable row level security;
alter table public.youth_club_leaders enable row level security;

grant select, insert, update, delete on
  public.youth_clubs,
  public.youth_club_members,
  public.youth_club_leaders
to authenticated;

drop policy if exists youth_clubs_member_read on public.youth_clubs;
create policy youth_clubs_member_read on public.youth_clubs
for select to authenticated
using (private.is_org_member(organization_id));

drop policy if exists youth_clubs_admin_insert on public.youth_clubs;
create policy youth_clubs_admin_insert on public.youth_clubs
for insert to authenticated
with check (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_clubs_admin_update on public.youth_clubs;
create policy youth_clubs_admin_update on public.youth_clubs
for update to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_clubs_admin_delete on public.youth_clubs;
create policy youth_clubs_admin_delete on public.youth_clubs
for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_club_members_member_read on public.youth_club_members;
create policy youth_club_members_member_read on public.youth_club_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and private.has_org_permission(c.organization_id, 'membership.read')
  )
);

drop policy if exists youth_club_members_self_join on public.youth_club_members;
create policy youth_club_members_self_join on public.youth_club_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'ACTIVE'
  and exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and private.is_org_member(c.organization_id)
  )
);

drop policy if exists youth_club_members_admin_update on public.youth_club_members;
create policy youth_club_members_admin_update on public.youth_club_members
for update to authenticated
using (
  exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and (
        private.has_org_permission(c.organization_id, 'membership.manage')
        or private.has_org_permission(c.organization_id, 'organization.manage')
      )
  )
)
with check (
  exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and (
        private.has_org_permission(c.organization_id, 'membership.manage')
        or private.has_org_permission(c.organization_id, 'organization.manage')
      )
  )
);

drop policy if exists youth_club_members_self_leave_or_admin_delete on public.youth_club_members;
create policy youth_club_members_self_leave_or_admin_delete on public.youth_club_members
for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and (
        private.has_org_permission(c.organization_id, 'membership.manage')
        or private.has_org_permission(c.organization_id, 'organization.manage')
      )
  )
);

drop policy if exists youth_club_leaders_member_read on public.youth_club_leaders;
create policy youth_club_leaders_member_read on public.youth_club_leaders
for select to authenticated
using (
  exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and private.is_org_member(c.organization_id)
  )
);

drop policy if exists youth_club_leaders_admin_write on public.youth_club_leaders;
create policy youth_club_leaders_admin_write on public.youth_club_leaders
for all to authenticated
using (
  exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and private.has_org_permission(c.organization_id, 'organization.manage')
  )
)
with check (
  exists (
    select 1
    from public.youth_clubs c
    where c.id = club_id
      and private.has_org_permission(c.organization_id, 'organization.manage')
  )
);

comment on table public.youth_clubs is
  'Persistent organization-scoped clubs for Adventist Youth Ministry programs.';
comment on table public.youth_club_members is
  'Membership records for youth clubs; membership visibility is protected by RLS.';
comment on table public.youth_club_leaders is
  'Role assignments for youth club leadership, writable by authorized organization managers.';
