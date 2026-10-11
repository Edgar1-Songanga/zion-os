-- Persistent youth club activities, participation, and organization-level operational reporting.

create table if not exists public.youth_club_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  club_id uuid not null,
  title text not null check (length(trim(title)) between 2 and 180),
  description text not null default '',
  activity_type text not null check (activity_type in (
    'meeting', 'camp', 'congress', 'investiture', 'training', 'mission', 'community_service'
  )),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  leader_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'PLANNED' check (status in ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_club_activities_club_org_fk
    foreign key (club_id, organization_id) references public.youth_clubs(id, organization_id) on delete cascade,
  constraint youth_club_activities_id_club_unique unique (id, club_id),
  constraint youth_club_activities_time_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists youth_club_activities_org_start_idx
  on public.youth_club_activities(organization_id, starts_at desc, status);
create index if not exists youth_club_activities_club_start_idx
  on public.youth_club_activities(club_id, starts_at desc, status);

create table if not exists public.youth_activity_participants (
  activity_id uuid not null,
  club_id uuid not null,
  user_id uuid not null,
  status text not null default 'REGISTERED' check (status in ('REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED')),
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (activity_id, user_id),
  constraint youth_activity_participants_activity_club_fk
    foreign key (activity_id, club_id) references public.youth_club_activities(id, club_id) on delete cascade,
  constraint youth_activity_participants_membership_fk
    foreign key (club_id, user_id) references public.youth_club_members(club_id, user_id) on delete cascade
);

create index if not exists youth_activity_participants_user_idx
  on public.youth_activity_participants(user_id, status);

create index if not exists youth_club_members_club_status_idx
  on public.youth_club_members(club_id, status, user_id);
create index if not exists youth_member_progress_org_status_idx
  on public.youth_member_progress(organization_id, status);
create index if not exists youth_investitures_org_status_idx
  on public.youth_investitures(organization_id, status);

alter table public.youth_club_activities enable row level security;
alter table public.youth_activity_participants enable row level security;

grant select, insert, update, delete on
  public.youth_club_activities,
  public.youth_activity_participants
to authenticated;

drop policy if exists youth_club_activities_read on public.youth_club_activities;
create policy youth_club_activities_read on public.youth_club_activities
for select to authenticated
using (
  private.has_org_permission(organization_id, 'membership.read')
  or private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_club_activities.club_id and l.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.youth_club_members m
    where m.club_id = youth_club_activities.club_id
      and m.user_id = (select auth.uid()) and m.status = 'ACTIVE'
  )
);

drop policy if exists youth_club_activities_insert on public.youth_club_activities;
create policy youth_club_activities_insert on public.youth_club_activities
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_club_activities.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_club_activities_update on public.youth_club_activities;
create policy youth_club_activities_update on public.youth_club_activities
for update to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_club_activities.club_id and l.user_id = (select auth.uid())
  )
)
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_club_activities.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_club_activities_delete on public.youth_club_activities;
create policy youth_club_activities_delete on public.youth_club_activities
for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists youth_activity_participants_read on public.youth_activity_participants;
create policy youth_activity_participants_read on public.youth_activity_participants
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.youth_club_activities a
    where a.id = youth_activity_participants.activity_id
      and (
        private.has_org_permission(a.organization_id, 'membership.read')
        or private.has_org_permission(a.organization_id, 'organization.manage')
      )
  )
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_activity_participants.club_id and l.user_id = (select auth.uid())
  )
);

drop policy if exists youth_activity_participants_self_register on public.youth_activity_participants;
create policy youth_activity_participants_self_register on public.youth_activity_participants
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'REGISTERED'
  and exists (
    select 1 from public.youth_club_members m
    where m.club_id = youth_activity_participants.club_id
      and m.user_id = (select auth.uid()) and m.status = 'ACTIVE'
  )
);

drop policy if exists youth_activity_participants_manager_write on public.youth_activity_participants;
create policy youth_activity_participants_manager_write on public.youth_activity_participants
for all to authenticated
using (
  exists (
    select 1 from public.youth_club_activities a
    where a.id = youth_activity_participants.activity_id
      and (
        private.has_org_permission(a.organization_id, 'organization.manage')
        or exists (
          select 1 from public.youth_club_leaders l
          where l.club_id = a.club_id and l.user_id = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1 from public.youth_club_activities a
    where a.id = youth_activity_participants.activity_id
      and (
        private.has_org_permission(a.organization_id, 'organization.manage')
        or exists (
          select 1 from public.youth_club_leaders l
          where l.club_id = a.club_id and l.user_id = (select auth.uid())
        )
      )
  )
);

-- Aggregate at the database layer so reports do not load whole tables into the API process.
create or replace function public.youth_ministry_operational_report(p_organization_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  result jsonb;
begin
  if not (
    private.has_org_permission(p_organization_id, 'membership.read')
    or private.has_org_permission(p_organization_id, 'organization.manage')
  ) then
    raise exception 'Insufficient permission to read youth ministry reports' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'organization_id', p_organization_id,
    'clubs_total', (select count(*) from public.youth_clubs c where c.organization_id = p_organization_id),
    'clubs_active', (select count(*) from public.youth_clubs c where c.organization_id = p_organization_id and c.status = 'ACTIVE'),
    'active_members_unique', (
      select count(distinct m.user_id)
      from public.youth_club_members m
      join public.youth_clubs c on c.id = m.club_id
      where c.organization_id = p_organization_id and m.status = 'ACTIVE'
    ),
    'activities_total', (select count(*) from public.youth_club_activities a where a.organization_id = p_organization_id),
    'activities_upcoming', (select count(*) from public.youth_club_activities a where a.organization_id = p_organization_id and a.status = 'PLANNED' and a.starts_at >= now()),
    'activities_completed', (select count(*) from public.youth_club_activities a where a.organization_id = p_organization_id and a.status = 'COMPLETED'),
    'progress_in_progress', (select count(*) from public.youth_member_progress p where p.organization_id = p_organization_id and p.status = 'IN_PROGRESS'),
    'progress_completed', (select count(*) from public.youth_member_progress p where p.organization_id = p_organization_id and p.status in ('COMPLETED', 'VERIFIED')),
    'investitures_requested', (select count(*) from public.youth_investitures i where i.organization_id = p_organization_id and i.status = 'REQUESTED'),
    'investitures_completed', (select count(*) from public.youth_investitures i where i.organization_id = p_organization_id and i.status = 'COMPLETED'),
    'attendance_confirmed', (select count(*) from public.youth_activity_participants p join public.youth_club_activities a on a.id = p.activity_id where a.organization_id = p_organization_id and p.status = 'ATTENDED'),
    'by_program', coalesce((
      select jsonb_agg(jsonb_build_object(
        'program_id', programs.program_id,
        'clubs', (select count(*) from public.youth_clubs c where c.organization_id = p_organization_id and c.program_id = programs.program_id),
        'active_memberships', (
          select count(*) from public.youth_club_members m join public.youth_clubs c on c.id = m.club_id
          where c.organization_id = p_organization_id and c.program_id = programs.program_id and m.status = 'ACTIVE'
        ),
        'activities', (select count(*) from public.youth_club_activities a join public.youth_clubs c on c.id = a.club_id where c.organization_id = p_organization_id and c.program_id = programs.program_id)
      ) order by programs.program_id)
      from (select distinct program_id from public.youth_clubs where organization_id = p_organization_id) programs
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.youth_ministry_operational_report(uuid) from public;
revoke all on function public.youth_ministry_operational_report(uuid) from anon;
grant execute on function public.youth_ministry_operational_report(uuid) to authenticated;

comment on table public.youth_club_activities is
  'Persistent organization-scoped youth club events and service activities.';
comment on table public.youth_activity_participants is
  'Registration and attendance history for club members and activities.';
