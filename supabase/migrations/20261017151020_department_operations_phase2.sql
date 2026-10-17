begin;

-- Department-specific operations. No personal data is backfilled by this migration.
-- Personal-record writes are blocked until an organization manager records its
-- approved local retention period for the relevant domain.
create unique index if not exists ministries_id_org_unique
  on public.ministries(id, organization_id);
create unique index if not exists church_member_records_id_org_unique
  on public.church_member_records(id, organization_id);

create table if not exists public.department_data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_domain text not null check (data_domain in ('SABBATH_SCHOOL_ATTENDANCE', 'PERSONAL_MINISTRY_FOLLOW_UP')),
  retention_days integer not null check (retention_days between 1 and 3650),
  approved_policy_label text not null check (length(trim(approved_policy_label)) between 3 and 200),
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, data_domain)
);
alter table public.department_data_retention_policies enable row level security;
revoke all on public.department_data_retention_policies from anon;
grant select, insert, update on public.department_data_retention_policies to authenticated;
drop policy if exists department_retention_admin_read on public.department_data_retention_policies;
create policy department_retention_admin_read on public.department_data_retention_policies
for select to authenticated using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (select 1 from public.ministries m join public.ministry_leaders ml on ml.ministry_id = m.id where m.organization_id = department_data_retention_policies.organization_id and ml.user_id = (select auth.uid()))
);
drop policy if exists department_retention_admin_write on public.department_data_retention_policies;
create policy department_retention_admin_write on public.department_data_retention_policies
for all to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage') and confirmed_by = (select auth.uid()));

create or replace function private.set_department_record_expiry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  policy_days integer;
begin
  select p.retention_days into policy_days
  from public.department_data_retention_policies p
  where p.organization_id = new.organization_id
    and p.data_domain = tg_argv[0]
    and p.confirmed_at is not null;
  if policy_days is null then
    raise exception 'Approved retention policy required for %', tg_argv[0]
      using errcode = '23514';
  end if;
  new.expires_at := pg_catalog.clock_timestamp() + pg_catalog.make_interval(days => policy_days);
  return new;
end;
$$;

create or replace function private.validate_department_ministry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  actual_department text;
begin
  select m.department into actual_department
  from public.ministries m
  where m.id = new.ministry_id and m.organization_id = new.organization_id;
  if actual_department is distinct from tg_argv[0] then
    raise exception 'Department module cannot be attached to this ministry' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.is_active_ministry_worker(p_ministry_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1 from public.ministry_leaders ml
    where ml.ministry_id = p_ministry_id and ml.user_id = p_user_id
  ) or exists (
    select 1 from public.ministry_members mm
    where mm.ministry_id = p_ministry_id and mm.user_id = p_user_id and mm.status = 'ACTIVE'
  );
$$;

create table if not exists public.sabbath_school_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid not null,
  name text not null check (length(trim(name)) between 2 and 120),
  meeting_day smallint check (meeting_day between 0 and 6),
  meeting_time time,
  room_label text check (room_label is null or length(trim(room_label)) <= 120),
  teacher_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (ministry_id, organization_id) references public.ministries(id, organization_id) on delete cascade
);
create index if not exists sabbath_school_classes_org_idx on public.sabbath_school_classes(organization_id, is_active, name);
alter table public.sabbath_school_classes enable row level security;
revoke all on public.sabbath_school_classes from anon;
grant select, insert, update, delete on public.sabbath_school_classes to authenticated;
drop policy if exists sabbath_school_classes_read on public.sabbath_school_classes;
create policy sabbath_school_classes_read on public.sabbath_school_classes for select to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = sabbath_school_classes.ministry_id and ml.user_id = (select auth.uid()))
  or teacher_user_id = (select auth.uid())
);
drop policy if exists sabbath_school_classes_write on public.sabbath_school_classes;
create policy sabbath_school_classes_write on public.sabbath_school_classes for all to authenticated
using (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = sabbath_school_classes.ministry_id and ml.user_id = (select auth.uid()))
)
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = sabbath_school_classes.ministry_id and ml.user_id = (select auth.uid()))
);
create trigger sabbath_school_class_department_check before insert or update of ministry_id on public.sabbath_school_classes
for each row execute function private.validate_department_ministry('sabbath-school-personal-ministries');
drop policy if exists department_retention_teacher_read on public.department_data_retention_policies;
create policy department_retention_teacher_read on public.department_data_retention_policies for select to authenticated
using (exists (select 1 from public.sabbath_school_classes c where c.organization_id = department_data_retention_policies.organization_id and c.teacher_user_id = (select auth.uid())));

create table if not exists public.sabbath_school_class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  organization_id uuid not null,
  member_record_id uuid not null,
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (class_id, member_record_id),
  foreign key (class_id, organization_id) references public.sabbath_school_classes(id, organization_id) on delete cascade,
  foreign key (member_record_id, organization_id) references public.church_member_records(id, organization_id) on delete cascade
);
create index if not exists sabbath_school_class_members_org_exp_idx on public.sabbath_school_class_members(organization_id, expires_at);
create trigger sabbath_school_class_members_expiry before insert on public.sabbath_school_class_members
for each row execute function private.set_department_record_expiry('SABBATH_SCHOOL_ATTENDANCE');
alter table public.sabbath_school_class_members enable row level security;
revoke all on public.sabbath_school_class_members from anon;
grant select, insert, delete on public.sabbath_school_class_members to authenticated;
drop policy if exists sabbath_school_class_members_read on public.sabbath_school_class_members;
create policy sabbath_school_class_members_read on public.sabbath_school_class_members for select to authenticated
using (expires_at > now() and exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));
drop policy if exists sabbath_school_class_members_write on public.sabbath_school_class_members;
create policy sabbath_school_class_members_write on public.sabbath_school_class_members for all to authenticated
using (exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))))
with check (expires_at > now() and exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));

create table if not exists public.sabbath_school_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  organization_id uuid not null,
  attendance_date date not null,
  lesson_reference text check (lesson_reference is null or length(trim(lesson_reference)) <= 160),
  recorded_by uuid not null default auth.uid() references auth.users(id),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (class_id, attendance_date),
  unique (id, organization_id),
  foreign key (class_id, organization_id) references public.sabbath_school_classes(id, organization_id) on delete cascade
);
create index if not exists sabbath_school_attendance_sessions_exp_idx on public.sabbath_school_attendance_sessions(organization_id, expires_at);
create trigger sabbath_school_attendance_sessions_expiry before insert on public.sabbath_school_attendance_sessions
for each row execute function private.set_department_record_expiry('SABBATH_SCHOOL_ATTENDANCE');
alter table public.sabbath_school_attendance_sessions enable row level security;
revoke all on public.sabbath_school_attendance_sessions from anon;
grant select, insert, delete on public.sabbath_school_attendance_sessions to authenticated;
drop policy if exists sabbath_school_attendance_sessions_read on public.sabbath_school_attendance_sessions;
create policy sabbath_school_attendance_sessions_read on public.sabbath_school_attendance_sessions for select to authenticated
using (expires_at > now() and exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));
drop policy if exists sabbath_school_attendance_sessions_write on public.sabbath_school_attendance_sessions;
create policy sabbath_school_attendance_sessions_write on public.sabbath_school_attendance_sessions for all to authenticated
using (exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))))
with check (expires_at > now() and recorded_by = (select auth.uid()) and exists (select 1 from public.sabbath_school_classes c where c.id = class_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));

create table if not exists public.sabbath_school_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  organization_id uuid not null,
  member_record_id uuid not null,
  attendance_status text not null check (attendance_status in ('PRESENT', 'ABSENT', 'EXCUSED')),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (session_id, member_record_id),
  foreign key (session_id, organization_id) references public.sabbath_school_attendance_sessions(id, organization_id) on delete cascade,
  foreign key (member_record_id, organization_id) references public.church_member_records(id, organization_id) on delete cascade
);
create index if not exists sabbath_school_attendance_exp_idx on public.sabbath_school_attendance(organization_id, expires_at);
create trigger sabbath_school_attendance_expiry before insert on public.sabbath_school_attendance
for each row execute function private.set_department_record_expiry('SABBATH_SCHOOL_ATTENDANCE');
alter table public.sabbath_school_attendance enable row level security;
revoke all on public.sabbath_school_attendance from anon;
grant select, insert, delete on public.sabbath_school_attendance to authenticated;
drop policy if exists sabbath_school_attendance_read on public.sabbath_school_attendance;
create policy sabbath_school_attendance_read on public.sabbath_school_attendance for select to authenticated
using (expires_at > now() and exists (select 1 from public.sabbath_school_attendance_sessions s join public.sabbath_school_classes c on c.id = s.class_id where s.id = session_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));
drop policy if exists sabbath_school_attendance_write on public.sabbath_school_attendance;
create policy sabbath_school_attendance_write on public.sabbath_school_attendance for all to authenticated
using (exists (select 1 from public.sabbath_school_attendance_sessions s join public.sabbath_school_classes c on c.id = s.class_id where s.id = session_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))))
with check (expires_at > now() and exists (select 1 from public.sabbath_school_attendance_sessions s join public.sabbath_school_classes c on c.id = s.class_id where s.id = session_id and (private.has_org_permission(c.organization_id, 'organization.manage') or c.teacher_user_id = (select auth.uid()) or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = c.ministry_id and ml.user_id = (select auth.uid())))));

create table if not exists public.personal_ministry_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid not null,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  contact_method text not null check (contact_method in ('IN_PERSON', 'PHONE', 'EMAIL')),
  contact_locator text not null check (length(trim(contact_locator)) between 2 and 254),
  consent_method text not null check (consent_method in ('VERBAL', 'WRITTEN', 'DIGITAL')),
  consent_recorded_at timestamptz not null default now(),
  consent_recorded_by uuid not null default auth.uid() references auth.users(id),
  assigned_to uuid not null references auth.users(id),
  follow_up_status text not null default 'NEW' check (follow_up_status in ('NEW', 'CONTACT_ATTEMPTED', 'MEETING_SCHEDULED', 'BIBLE_STUDY_STARTED', 'DECLINED', 'COMPLETED')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (ministry_id, organization_id) references public.ministries(id, organization_id) on delete cascade
);
create index if not exists personal_ministry_follow_ups_assignee_idx on public.personal_ministry_follow_ups(organization_id, assigned_to, expires_at);
create trigger personal_ministry_follow_ups_expiry before insert on public.personal_ministry_follow_ups
for each row execute function private.set_department_record_expiry('PERSONAL_MINISTRY_FOLLOW_UP');
create trigger personal_ministry_department_check before insert or update of ministry_id on public.personal_ministry_follow_ups
for each row execute function private.validate_department_ministry('sabbath-school-personal-ministries');
alter table public.personal_ministry_follow_ups enable row level security;
revoke all on public.personal_ministry_follow_ups from anon;
grant select, insert, delete on public.personal_ministry_follow_ups to authenticated;
grant update (follow_up_status, updated_at) on public.personal_ministry_follow_ups to authenticated;
drop policy if exists personal_ministry_follow_ups_read on public.personal_ministry_follow_ups;
create policy personal_ministry_follow_ups_read on public.personal_ministry_follow_ups for select to authenticated
using (expires_at > now() and (assigned_to = (select auth.uid()) or private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = personal_ministry_follow_ups.ministry_id and ml.user_id = (select auth.uid()))));
drop policy if exists personal_ministry_follow_ups_insert on public.personal_ministry_follow_ups;
create policy personal_ministry_follow_ups_insert on public.personal_ministry_follow_ups for insert to authenticated
with check (
  consent_recorded_by = (select auth.uid())
  and (private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = personal_ministry_follow_ups.ministry_id and ml.user_id = (select auth.uid())))
  and (private.is_active_ministry_worker(ministry_id, assigned_to) or (assigned_to = (select auth.uid()) and private.has_org_permission(organization_id, 'organization.manage')))
  and exists (select 1 from public.department_data_retention_policies p where p.organization_id = personal_ministry_follow_ups.organization_id and p.data_domain = 'PERSONAL_MINISTRY_FOLLOW_UP' and p.confirmed_at is not null)
);
drop policy if exists personal_ministry_follow_ups_update on public.personal_ministry_follow_ups;
create policy personal_ministry_follow_ups_update on public.personal_ministry_follow_ups for update to authenticated
using (assigned_to = (select auth.uid()) or private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = personal_ministry_follow_ups.ministry_id and ml.user_id = (select auth.uid())))
with check (assigned_to = (select auth.uid()) or private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = personal_ministry_follow_ups.ministry_id and ml.user_id = (select auth.uid())));
drop policy if exists personal_ministry_follow_ups_delete on public.personal_ministry_follow_ups;
create policy personal_ministry_follow_ups_delete on public.personal_ministry_follow_ups for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = personal_ministry_follow_ups.ministry_id and ml.user_id = (select auth.uid())));

create table if not exists public.stewardship_period_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid not null,
  period_start date not null,
  period_end date not null,
  activities_count integer not null default 0 check (activities_count between 0 and 10000),
  programs_completed_count integer not null default 0 check (programs_completed_count between 0 and 10000),
  participants_count integer check (participants_count is null or participants_count between 5 and 100000),
  materials_distributed_count integer not null default 0 check (materials_distributed_count between 0 and 100000),
  submitted_by uuid not null default auth.uid() references auth.users(id),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (ministry_id, period_start, period_end),
  foreign key (ministry_id, organization_id) references public.ministries(id, organization_id) on delete cascade
);
create index if not exists stewardship_period_reports_idx on public.stewardship_period_reports(organization_id, period_start desc);
alter table public.stewardship_period_reports enable row level security;
revoke all on public.stewardship_period_reports from anon;
grant select, insert, update on public.stewardship_period_reports to authenticated;
drop policy if exists stewardship_period_reports_read on public.stewardship_period_reports;
create policy stewardship_period_reports_read on public.stewardship_period_reports for select to authenticated
using (private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = stewardship_period_reports.ministry_id and ml.user_id = (select auth.uid())));
drop policy if exists stewardship_period_reports_write on public.stewardship_period_reports;
create policy stewardship_period_reports_insert on public.stewardship_period_reports for insert to authenticated
with check ((private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = stewardship_period_reports.ministry_id and ml.user_id = (select auth.uid()))) and submitted_by = (select auth.uid()));
drop policy if exists stewardship_period_reports_update on public.stewardship_period_reports;
create policy stewardship_period_reports_update on public.stewardship_period_reports for update to authenticated
using (private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = stewardship_period_reports.ministry_id and ml.user_id = (select auth.uid())))
with check ((private.has_org_permission(organization_id, 'organization.manage') or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = stewardship_period_reports.ministry_id and ml.user_id = (select auth.uid()))) and submitted_by = (select auth.uid()));
create trigger stewardship_ministry_check before insert or update of ministry_id on public.stewardship_period_reports
for each row execute function private.validate_department_ministry('stewardship');

create or replace function public.sabbath_school_class_roster(p_class_id uuid)
returns table (member_record_id uuid, first_name text, last_name text)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  target_org uuid;
begin
  select c.organization_id into target_org
  from public.sabbath_school_classes c
  where c.id = p_class_id and c.is_active;
  if target_org is null or not (
    private.has_org_permission(target_org, 'organization.manage')
    or exists (select 1 from public.sabbath_school_classes c where c.id = p_class_id and c.teacher_user_id = (select auth.uid()))
    or exists (select 1 from public.sabbath_school_classes c join public.ministry_leaders ml on ml.ministry_id = c.ministry_id where c.id = p_class_id and ml.user_id = (select auth.uid()))
  ) then
    raise exception 'Class not found or not authorized' using errcode = '42501';
  end if;
  return query
    select r.id, r.first_name, r.last_name
    from public.sabbath_school_class_members cm
    join public.church_member_records r on r.id = cm.member_record_id and r.organization_id = cm.organization_id
    where cm.class_id = p_class_id and cm.expires_at > now() and r.membership_status = 'ACTIVE'
    order by r.last_name, r.first_name;
end;
$$;

create or replace function public.sabbath_school_member_candidates(p_organization_id uuid)
returns table (id uuid, first_name text, last_name text)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if not (private.has_org_permission(p_organization_id, 'organization.manage')
       or private.has_org_permission(p_organization_id, 'church.members.read')) then
    raise exception 'Not authorized to select church members' using errcode = '42501';
  end if;
  return query
    select r.id, r.first_name, r.last_name
    from public.church_member_records r
    where r.organization_id = p_organization_id and r.membership_status = 'ACTIVE'
    order by r.last_name, r.first_name
    limit 1000;
end;
$$;

create or replace function public.purge_expired_department_records(p_organization_id uuid, p_data_domain text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  deleted_count integer := 0;
  affected integer := 0;
  authorized boolean;
begin
  if p_data_domain not in ('SABBATH_SCHOOL_ATTENDANCE', 'PERSONAL_MINISTRY_FOLLOW_UP') then
    raise exception 'Unsupported department data domain' using errcode = '22023';
  end if;
  select private.has_org_permission(p_organization_id, 'organization.manage')
      or exists (
        select 1 from public.ministries m join public.ministry_leaders ml on ml.ministry_id = m.id
        where m.organization_id = p_organization_id
          and m.department = 'sabbath-school-personal-ministries'
          and p_data_domain in ('SABBATH_SCHOOL_ATTENDANCE', 'PERSONAL_MINISTRY_FOLLOW_UP')
          and ml.user_id = (select auth.uid())
      )
      or (p_data_domain = 'SABBATH_SCHOOL_ATTENDANCE' and exists (
        select 1 from public.sabbath_school_classes c
        where c.organization_id = p_organization_id and c.teacher_user_id = (select auth.uid())
      ))
      or (p_data_domain = 'PERSONAL_MINISTRY_FOLLOW_UP' and exists (
        select 1 from public.personal_ministry_follow_ups f
        where f.organization_id = p_organization_id and f.assigned_to = (select auth.uid())
      ))
    into authorized;
  if not coalesce(authorized, false) then
    raise exception 'Not authorized to purge department records' using errcode = '42501';
  end if;

  if p_data_domain = 'SABBATH_SCHOOL_ATTENDANCE' then
    delete from public.sabbath_school_attendance a where a.organization_id = p_organization_id and a.expires_at <= now();
    get diagnostics affected = row_count; deleted_count := deleted_count + affected;
    delete from public.sabbath_school_attendance_sessions s where s.organization_id = p_organization_id and s.expires_at <= now();
    get diagnostics affected = row_count; deleted_count := deleted_count + affected;
    delete from public.sabbath_school_class_members cm where cm.organization_id = p_organization_id and cm.expires_at <= now();
    get diagnostics affected = row_count; deleted_count := deleted_count + affected;
  else
    delete from public.personal_ministry_follow_ups f where f.organization_id = p_organization_id and f.expires_at <= now();
    get diagnostics affected = row_count; deleted_count := deleted_count + affected;
  end if;
  return pg_catalog.jsonb_build_object('deleted_records', deleted_count, 'data_domain', p_data_domain);
end;
$$;

create or replace function public.save_sabbath_school_attendance(p_class_id uuid, p_attendance_date date, p_lesson_reference text, p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  target_class public.sabbath_school_classes%rowtype;
  new_session public.sabbath_school_attendance_sessions%rowtype;
  record_count integer;
  invalid_count integer;
begin
  if p_attendance_date is null or p_attendance_date > current_date then
    raise exception 'Attendance date must be today or earlier' using errcode = '22023';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 1000 then
    raise exception 'Attendance records must be a non-empty array of at most 1000 rows' using errcode = '22023';
  end if;
  select * into target_class from public.sabbath_school_classes c where c.id = p_class_id and c.is_active for update;
  if target_class.id is null or not (
    private.has_org_permission(target_class.organization_id, 'organization.manage')
    or target_class.teacher_user_id = (select auth.uid())
    or exists (select 1 from public.ministry_leaders ml where ml.ministry_id = target_class.ministry_id and ml.user_id = (select auth.uid()))
  ) then
    raise exception 'Class not found or not authorized' using errcode = '42501';
  end if;
  select count(*) into record_count from jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text);
  select count(*) into invalid_count
  from jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text)
  where x.member_record_id is null
    or x.attendance_status not in ('PRESENT','ABSENT','EXCUSED')
    or not exists (
      select 1 from public.sabbath_school_class_members cm
      join public.church_member_records mr on mr.id = cm.member_record_id and mr.organization_id = cm.organization_id
      where cm.class_id = p_class_id and cm.member_record_id = x.member_record_id
        and cm.expires_at > now() and mr.membership_status = 'ACTIVE'
    );
  if invalid_count > 0 or record_count <> (select count(distinct x.member_record_id) from jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text)) then
    raise exception 'Every attendance row must be unique and refer to an active class member' using errcode = '22023';
  end if;
  insert into public.sabbath_school_attendance_sessions(class_id, organization_id, attendance_date, lesson_reference, recorded_by)
  values (target_class.id, target_class.organization_id, p_attendance_date, nullif(trim(p_lesson_reference), ''), (select auth.uid()))
  returning * into new_session;
  insert into public.sabbath_school_attendance(session_id, organization_id, member_record_id, attendance_status)
  select new_session.id, target_class.organization_id, x.member_record_id, x.attendance_status
  from jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text);
  return pg_catalog.to_jsonb(new_session);
end;
$$;

revoke all on function public.sabbath_school_class_roster(uuid) from public, anon;
revoke all on function public.sabbath_school_member_candidates(uuid) from public, anon;
revoke all on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) from public, anon;
revoke all on function public.purge_expired_department_records(uuid, text) from public, anon;
revoke all on function private.is_active_ministry_worker(uuid, uuid) from public, anon;
grant execute on function public.sabbath_school_class_roster(uuid) to authenticated;
grant execute on function public.sabbath_school_member_candidates(uuid) to authenticated;
grant execute on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) to authenticated;
grant execute on function public.purge_expired_department_records(uuid, text) to authenticated;
grant execute on function private.is_active_ministry_worker(uuid, uuid) to authenticated;

comment on table public.department_data_retention_policies is 'Organization-confirmed retention policy gate; sensitive department records cannot be inserted until set.';
comment on table public.personal_ministry_follow_ups is 'Consent-based minimal personal ministry follow-up, restricted to assigned worker, department leaders, and organization managers; automatically expires per confirmed policy.';
comment on table public.stewardship_period_reports is 'Aggregated non-financial stewardship activity reports; individual donor/offering data is deliberately excluded.';

create or replace function private.apply_department_retention_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.data_domain = 'SABBATH_SCHOOL_ATTENDANCE' then
    update public.sabbath_school_class_members
      set expires_at = least(expires_at, enrolled_at + pg_catalog.make_interval(days => new.retention_days))
      where organization_id = new.organization_id;
    update public.sabbath_school_attendance_sessions
      set expires_at = least(expires_at, recorded_at + pg_catalog.make_interval(days => new.retention_days))
      where organization_id = new.organization_id;
    update public.sabbath_school_attendance
      set expires_at = least(expires_at, recorded_at + pg_catalog.make_interval(days => new.retention_days))
      where organization_id = new.organization_id;
  elsif new.data_domain = 'PERSONAL_MINISTRY_FOLLOW_UP' then
    update public.personal_ministry_follow_ups
      set expires_at = least(expires_at, created_at + pg_catalog.make_interval(days => new.retention_days))
      where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
drop trigger if exists department_retention_apply_change on public.department_data_retention_policies;
create trigger department_retention_apply_change
after update of retention_days on public.department_data_retention_policies
for each row execute function private.apply_department_retention_change();
revoke all on function private.apply_department_retention_change() from public, anon;

commit;
