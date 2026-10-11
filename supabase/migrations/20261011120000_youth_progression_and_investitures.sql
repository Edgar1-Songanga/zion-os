-- Organization-scoped curriculum, member progression, and investiture records.
-- Catalog entries are editable by authorized organization managers; no unverified curriculum is seeded.

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'youth_clubs_id_organization_unique'
      and conrelid = 'public.youth_clubs'::regclass
  ) then
    alter table public.youth_clubs
      add constraint youth_clubs_id_organization_unique unique (id, organization_id);
  end if;
end $;

create table if not exists public.youth_achievement_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id text not null check (program_id in (
    'adventurers', 'pathfinders', 'ambassadors', 'young-adults', 'public-campus-ministries'
  )),
  kind text not null check (kind in ('CLASS', 'SPECIALTY')),
  code text not null check (length(trim(code)) between 2 and 60),
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '',
  level text not null default '',
  prerequisites jsonb not null default '[]'::jsonb check (jsonb_typeof(prerequisites) = 'array'),
  official_reference_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_achievement_catalog_org_code_unique unique (organization_id, program_id, kind, code),
  constraint youth_achievement_catalog_id_org_unique unique (id, organization_id),
  constraint youth_achievement_catalog_reference_https check (official_reference_url is null or official_reference_url ~* '^https://')
);

create index if not exists youth_achievement_catalog_org_program_idx
  on public.youth_achievement_catalog(organization_id, program_id, kind, is_active, name);

create table if not exists public.youth_member_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  club_id uuid not null,
  user_id uuid not null,
  catalog_item_id uuid not null,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'RETURNED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  evidence_url text,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_member_progress_club_org_fk
    foreign key (club_id, organization_id) references public.youth_clubs(id, organization_id) on delete cascade,
  constraint youth_member_progress_catalog_org_fk
    foreign key (catalog_item_id, organization_id) references public.youth_achievement_catalog(id, organization_id) on delete cascade,
  constraint youth_member_progress_membership_fk
    foreign key (club_id, user_id) references public.youth_club_members(club_id, user_id) on delete cascade,
  constraint youth_member_progress_unique unique (club_id, user_id, catalog_item_id),
  constraint youth_member_progress_evidence_https check (evidence_url is null or evidence_url ~* '^https://')
);

create index if not exists youth_member_progress_club_user_idx
  on public.youth_member_progress(club_id, user_id, status);

create table if not exists public.youth_investitures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  club_id uuid not null,
  user_id uuid not null,
  class_catalog_id uuid not null,
  scheduled_date date,
  completed_at timestamptz,
  location text not null default '',
  officiated_by uuid references auth.users(id) on delete set null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED')),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_investitures_club_org_fk
    foreign key (club_id, organization_id) references public.youth_clubs(id, organization_id) on delete cascade,
  constraint youth_investitures_class_org_fk
    foreign key (class_catalog_id, organization_id) references public.youth_achievement_catalog(id, organization_id) on delete restrict,
  constraint youth_investitures_membership_fk
    foreign key (club_id, user_id) references public.youth_club_members(club_id, user_id) on delete cascade
);

create index if not exists youth_investitures_club_date_idx
  on public.youth_investitures(club_id, scheduled_date desc, status);

alter table public.youth_achievement_catalog enable row level security;
alter table public.youth_member_progress enable row level security;
alter table public.youth_investitures enable row level security;

grant select, insert, update, delete on
  public.youth_achievement_catalog,
  public.youth_member_progress,
  public.youth_investitures
to authenticated;

drop policy if exists youth_achievement_catalog_org_read on public.youth_achievement_catalog;
create policy youth_achievement_catalog_org_read on public.youth_achievement_catalog
for select to authenticated using (private.is_org_member(organization_id));

drop policy if exists youth_achievement_catalog_org_manage on public.youth_achievement_catalog;
create policy youth_achievement_catalog_org_manage on public.youth_achievement_catalog
for all to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_member_progress_read on public.youth_member_progress;
create policy youth_member_progress_read on public.youth_member_progress
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_org_permission(organization_id, 'membership.read')
  or private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_member_progress.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_member_progress_insert on public.youth_member_progress;
create policy youth_member_progress_insert on public.youth_member_progress
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_member_progress.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_member_progress_update on public.youth_member_progress;
create policy youth_member_progress_update on public.youth_member_progress
for update to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_member_progress.club_id and l.user_id = (select auth.uid())
  )
)
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or (
    status <> 'VERIFIED'
    and exists (
      select 1 from public.youth_club_leaders l
      where l.club_id = youth_member_progress.club_id and l.user_id = (select auth.uid())
    )
  )
);

drop policy if exists youth_member_progress_delete on public.youth_member_progress;
create policy youth_member_progress_delete on public.youth_member_progress
for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_investitures_read on public.youth_investitures;
create policy youth_investitures_read on public.youth_investitures
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_org_permission(organization_id, 'membership.read')
  or private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_investitures.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_investitures_insert on public.youth_investitures;
create policy youth_investitures_insert on public.youth_investitures
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_investitures.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_investitures_update on public.youth_investitures;
create policy youth_investitures_update on public.youth_investitures
for update to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_investitures_delete on public.youth_investitures;
create policy youth_investitures_delete on public.youth_investitures
for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

comment on table public.youth_achievement_catalog is
  'Editable organization-scoped classes and specialties; official curriculum is not fabricated or pre-seeded.';
comment on table public.youth_member_progress is
  'Persistent class/specialty progress with leader completion and organization-manager verification.';
comment on table public.youth_investitures is
  'Investiture requests, approvals, completion records, and officiant details.';

-- Enforce curriculum/program consistency even for direct authenticated REST requests.
create or replace function public.validate_youth_progression_program()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  club_program text;
  club_org uuid;
  item_program text;
  item_org uuid;
  item_kind text;
begin
  select program_id, organization_id into club_program, club_org
  from public.youth_clubs where id = new.club_id;

  if tg_table_name = 'youth_investitures' then
    select program_id, organization_id, kind into item_program, item_org, item_kind
    from public.youth_achievement_catalog where id = new.class_catalog_id;
  else
    select program_id, organization_id, kind into item_program, item_org, item_kind
    from public.youth_achievement_catalog where id = new.catalog_item_id;
  end if;

  if club_program is null or item_program is null
     or club_org <> new.organization_id or item_org <> new.organization_id
     or club_program <> item_program then
    raise exception 'Youth curriculum item must match the club organization and program';
  end if;

  if tg_table_name = 'youth_investitures' and item_kind <> 'CLASS' then
    raise exception 'Investitures can only reference class catalog items';
  end if;

  return new;
end;
$$;

drop trigger if exists youth_member_progress_program_guard on public.youth_member_progress;
create trigger youth_member_progress_program_guard
before insert or update of organization_id, club_id, catalog_item_id
on public.youth_member_progress
for each row execute function public.validate_youth_progression_program();

drop trigger if exists youth_investitures_program_guard on public.youth_investitures;
create trigger youth_investitures_program_guard
before insert or update of organization_id, club_id, class_catalog_id
on public.youth_investitures
for each row execute function public.validate_youth_progression_program();
