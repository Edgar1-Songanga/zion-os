\set ON_ERROR_STOP on

create schema if not exists auth;
create schema if not exists private;
create schema if not exists extensions;
create schema if not exists cron;
create table cron.job (
  jobid bigint generated always as identity primary key,
  schedule text not null,
  command text not null,
  jobname text unique
);
create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint language plpgsql
as $cron$
declare v_job_id bigint;
begin
  insert into cron.job(jobname, schedule, command)
  values (job_name, schedule, command)
  returning jobid into v_job_id;
  return v_job_id;
end;
$cron$;
create or replace function cron.unschedule(job_id bigint)
returns boolean language plpgsql
as $cron$
begin
  delete from cron.job where jobid = job_id;
  return found;
end;
$cron$;
create extension if not exists pgcrypto with schema extensions;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create table auth.users (id uuid primary key, email text);
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

create table public.organizations (
  id uuid primary key,
  name text not null default 'Test organization',
  slug text not null default 'test-organization',
  organization_type text not null default 'LOCAL_CHURCH',
  parent_id uuid references public.organizations(id),
  created_by uuid references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
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

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  bio text,
  country_code text,
  privacy jsonb not null default '{}'::jsonb
);

create table public.resa_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  kind text not null default 'direct',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.resa_conversation_members (
  conversation_id uuid not null references public.resa_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  primary key (conversation_id, user_id)
);
create table public.resa_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
alter table public.resa_follows enable row level security;
create policy resa_follows_authenticated_read on public.resa_follows for select to authenticated using (true);
create policy resa_follows_owner_delete on public.resa_follows for delete to authenticated using (follower_id = (select auth.uid()));
grant select, insert, delete on public.resa_follows to authenticated;

create table public.resa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.resa_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.resa_messages enable row level security;
create policy resa_messages_member on public.resa_messages for all to authenticated
using (exists(select 1 from public.resa_conversation_members m where m.conversation_id = resa_messages.conversation_id and m.user_id = (select auth.uid())))
with check (sender_id = (select auth.uid()) and exists(select 1 from public.resa_conversation_members m where m.conversation_id = resa_messages.conversation_id and m.user_id = (select auth.uid())));
grant select, insert, update, delete on public.resa_messages to authenticated;

create table public.resa_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.resa_conversations(id) on delete cascade,
  initiator_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','active','ended','missed','declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);
create table public.resa_call_participants (
  call_id uuid not null references public.resa_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing','joined','declined','left')),
  joined_at timestamptz,
  left_at timestamptz,
  primary key (call_id,user_id)
);
create table public.resa_call_signals (
  id bigserial primary key,
  call_id uuid not null references public.resa_calls(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','ice','renegotiate','hangup')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.resa_calls enable row level security;
alter table public.resa_call_participants enable row level security;
alter table public.resa_call_signals enable row level security;

create policy resa_calls_member_select on public.resa_calls
for select to authenticated
using (
  exists (
    select 1 from public.resa_conversation_members m
    where m.conversation_id = resa_calls.conversation_id
      and m.user_id = (select auth.uid())
  )
);
create policy resa_call_participants_select on public.resa_call_participants
for select to authenticated
using (
  exists (
    select 1 from public.resa_calls c
    join public.resa_conversation_members m on m.conversation_id = c.conversation_id
    where c.id = resa_call_participants.call_id
      and m.user_id = (select auth.uid())
  )
);
grant usage on schema private to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant select, insert on public.resa_conversation_members to authenticated;
grant select,insert,update on public.resa_calls, public.resa_call_participants, public.resa_call_signals to authenticated;
grant usage,select on sequence public.resa_call_signals_id_seq to authenticated;


-- Minimal audience-visibility fixture used by RESA content RLS regressions.
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ACTIVE',
  primary key (organization_id, user_id)
);
create or replace function private.is_org_member(target_org uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create table public.resa_communities (
  id uuid primary key,
  organization_id uuid references public.organizations(id),
  created_by uuid not null references auth.users(id),
  name text not null,
  slug text not null unique,
  description text,
  visibility text not null default 'public',
  status text not null default 'active'
);
create table public.resa_community_members (
  community_id uuid not null references public.resa_communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
alter table public.resa_community_members enable row level security;
create table public.resa_contents (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text,
  body text,
  visibility text not null default 'public',
  organization_id uuid references public.organizations(id),
  community_id uuid references public.resa_communities(id),
  media_type text,
  media_url text,
  media_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.resa_contents enable row level security;
create policy resa_contents_public_read on public.resa_contents
  for select to authenticated
  using (visibility = 'public' or author_id = (select auth.uid()));
create policy resa_contents_owner_insert on public.resa_contents
  for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy resa_contents_owner_update on public.resa_contents
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
grant select, insert, update, delete on public.resa_contents to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;


create or replace function private.resa_is_community_moderator(p_community_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.resa_communities c
    where c.id = p_community_id and c.created_by = p_user_id
  ) or exists (
    select 1 from public.resa_community_members m
    where m.community_id = p_community_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role in ('owner','moderator')
  );
$$;
grant execute on function private.resa_is_community_moderator(uuid,uuid) to authenticated;

create policy resa_community_members_read
on public.resa_community_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_community_moderator(community_id, (select auth.uid()))
);

create table public.resa_events (
  id uuid primary key,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  meeting_url text,
  visibility text not null default 'public',
  community_id uuid references public.resa_communities(id),
  organization_id uuid references public.organizations(id),
  status text not null default 'scheduled',
  constraint resa_events_check check (ends_at is null or ends_at > starts_at)
);
create table public.resa_event_participants (
  event_id uuid not null references public.resa_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'interested',
  primary key (event_id,user_id),
  constraint resa_event_participants_response_check check (response in ('interested','going','declined'))
);
alter table public.resa_events enable row level security;
alter table public.resa_event_participants enable row level security;
create policy resa_events_read on public.resa_events
  for select to authenticated
  using (visibility = 'public' or created_by = (select auth.uid()) or exists (
    select 1 from public.resa_event_participants p where p.event_id = id and p.user_id = (select auth.uid())
  ));
create policy resa_events_insert on public.resa_events
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy resa_events_update on public.resa_events
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy resa_event_participants_owner on public.resa_event_participants
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update on public.resa_events to authenticated;
grant select, insert, update, delete on public.resa_event_participants to authenticated;
grant select, insert, update, delete on public.resa_community_members to authenticated;
