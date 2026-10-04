-- ZION Youth engine persistence and safeguarding foundation.
create table if not exists public.youth_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_key text not null,
  name text not null,
  age_range text not null,
  philosophy text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, program_key)
);

create table if not exists public.youth_clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.youth_programs(id) on delete restrict,
  name text not null,
  motto text,
  church_name text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists youth_clubs_org_idx on public.youth_clubs(organization_id, status, name);

create table if not exists public.youth_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  legal_name text not null,
  date_of_birth date,
  guardian_user_id uuid references auth.users(id) on delete set null,
  consent_status text not null default 'PENDING' check (consent_status in ('PENDING','GRANTED','DECLINED','NOT_REQUIRED')),
  safeguarding_status text not null default 'CLEAR' check (safeguarding_status in ('CLEAR','REVIEW_REQUIRED','RESTRICTED')),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists youth_members_org_idx on public.youth_members(organization_id, active, legal_name);
create index if not exists youth_members_guardian_idx on public.youth_members(guardian_user_id);

create table if not exists public.youth_club_members (
  club_id uuid not null references public.youth_clubs(id) on delete cascade,
  member_id uuid not null references public.youth_members(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MEMBER','LEADER','ASSISTANT_LEADER','COORDINATOR')),
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (club_id, member_id)
);

create table if not exists public.youth_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  club_id uuid not null references public.youth_clubs(id) on delete cascade,
  title text not null,
  activity_type text not null check (activity_type in ('SPIRITUAL','SERVICE','TRAINING','OUTREACH','FELLOWSHIP')),
  scheduled_on date not null,
  status text not null default 'PLANNED' check (status in ('PLANNED','COMPLETED','CANCELLED')),
  participants_count integer not null default 0 check (participants_count >= 0),
  service_hours numeric(10,2) not null default 0 check (service_hours >= 0),
  spiritual_actions integer not null default 0 check (spiritual_actions >= 0),
  skills_completed integer not null default 0 check (skills_completed >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists youth_activities_club_date_idx on public.youth_activities(club_id, scheduled_on desc);

create table if not exists public.youth_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.youth_members(id) on delete cascade,
  program_id uuid not null references public.youth_programs(id) on delete restrict,
  title text not null,
  achievement_type text not null default 'CLASS',
  verified boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  achieved_on date not null default current_date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists youth_achievements_member_idx on public.youth_achievements(member_id, achieved_on desc);

create table if not exists public.youth_certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.youth_members(id) on delete cascade,
  program_id uuid not null references public.youth_programs(id) on delete restrict,
  title text not null,
  verification_code text not null unique,
  status text not null default 'VALID' check (status in ('VALID','REVOKED')),
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);
create index if not exists youth_certificates_member_idx on public.youth_certificates(member_id, issued_at desc);

create table if not exists public.youth_safeguarding_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.youth_members(id) on delete cascade,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','UNDER_REVIEW','CLOSED')),
  summary text not null,
  restricted_notes text,
  reported_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists youth_safeguarding_member_idx on public.youth_safeguarding_events(member_id, status);

insert into public.permissions (key, name, description)
values
  ('youth.manage', 'Manage Youth Ministry', 'Manage Youth clubs, members, programs and activities'),
  ('youth.verify', 'Verify Youth achievements', 'Verify Youth achievements and issue or revoke certificates'),
  ('youth.safeguarding.read', 'Read Youth safeguarding data', 'Read restricted Youth safeguarding records')
on conflict (key) do nothing;

alter table public.youth_programs enable row level security;
alter table public.youth_clubs enable row level security;
alter table public.youth_members enable row level security;
alter table public.youth_club_members enable row level security;
alter table public.youth_activities enable row level security;
alter table public.youth_achievements enable row level security;
alter table public.youth_certificates enable row level security;
alter table public.youth_safeguarding_events enable row level security;

drop policy if exists youth_programs_member_read on public.youth_programs;
create policy youth_programs_member_read on public.youth_programs for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists youth_programs_manage on public.youth_programs;
create policy youth_programs_manage on public.youth_programs for all to authenticated using (private.has_org_permission(organization_id, 'youth.manage')) with check (private.has_org_permission(organization_id, 'youth.manage'));

drop policy if exists youth_clubs_member_read on public.youth_clubs;
create policy youth_clubs_member_read on public.youth_clubs for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists youth_clubs_manage on public.youth_clubs;
create policy youth_clubs_manage on public.youth_clubs for all to authenticated using (private.has_org_permission(organization_id, 'youth.manage')) with check (private.has_org_permission(organization_id, 'youth.manage') and created_by = (select auth.uid()));

drop policy if exists youth_members_self_read on public.youth_members;
create policy youth_members_self_read on public.youth_members for select to authenticated using (user_id = (select auth.uid()) or guardian_user_id = (select auth.uid()) or private.has_org_permission(organization_id, 'youth.manage'));
drop policy if exists youth_members_manage on public.youth_members;
create policy youth_members_manage on public.youth_members for all to authenticated using (private.has_org_permission(organization_id, 'youth.manage')) with check (private.has_org_permission(organization_id, 'youth.manage') and created_by = (select auth.uid()));

drop policy if exists youth_club_members_read on public.youth_club_members;
create policy youth_club_members_read on public.youth_club_members for select to authenticated using (exists (select 1 from public.youth_clubs club where club.id = club_id and private.is_org_member(club.organization_id)));
drop policy if exists youth_club_members_manage on public.youth_club_members;
create policy youth_club_members_manage on public.youth_club_members for all to authenticated using (exists (select 1 from public.youth_clubs club where club.id = club_id and private.has_org_permission(club.organization_id, 'youth.manage'))) with check (exists (select 1 from public.youth_clubs club where club.id = club_id and private.has_org_permission(club.organization_id, 'youth.manage')));

-- Common organization-scoped policy pattern for operational Youth records.
drop policy if exists youth_activities_member_read on public.youth_activities;
create policy youth_activities_member_read on public.youth_activities for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists youth_activities_manage on public.youth_activities;
create policy youth_activities_manage on public.youth_activities for all to authenticated using (private.has_org_permission(organization_id, 'youth.manage')) with check (private.has_org_permission(organization_id, 'youth.manage') and created_by = (select auth.uid()));

drop policy if exists youth_achievements_member_read on public.youth_achievements;
create policy youth_achievements_member_read on public.youth_achievements for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists youth_achievements_manage on public.youth_achievements;
create policy youth_achievements_manage on public.youth_achievements for all to authenticated using (private.has_org_permission(organization_id, 'youth.manage')) with check (private.has_org_permission(organization_id, 'youth.manage') and created_by = (select auth.uid()));

drop policy if exists youth_certificates_member_read on public.youth_certificates;
create policy youth_certificates_member_read on public.youth_certificates for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists youth_certificates_verify on public.youth_certificates;
create policy youth_certificates_verify on public.youth_certificates for all to authenticated using (private.has_org_permission(organization_id, 'youth.verify')) with check (private.has_org_permission(organization_id, 'youth.verify'));

drop policy if exists youth_safeguarding_restricted_read on public.youth_safeguarding_events;
create policy youth_safeguarding_restricted_read on public.youth_safeguarding_events for select to authenticated using (private.has_org_permission(organization_id, 'youth.safeguarding.read'));
drop policy if exists youth_safeguarding_manage on public.youth_safeguarding_events;
create policy youth_safeguarding_manage on public.youth_safeguarding_events for all to authenticated using (private.has_org_permission(organization_id, 'youth.safeguarding.read')) with check (private.has_org_permission(organization_id, 'youth.safeguarding.read') and reported_by = (select auth.uid()));
