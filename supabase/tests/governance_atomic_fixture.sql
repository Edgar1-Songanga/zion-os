-- Minimal disposable schema for governance RPC security regression. Never run in production.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists private;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function private.has_org_permission(uuid, text)
returns boolean language sql stable as $fn$ select true $fn$;
create or replace function private.is_org_member(uuid)
returns boolean language sql stable as $fn$ select true $fn$;

create table public.governance_councils (
  id uuid primary key, organization_id uuid not null, quorum_type text not null, quorum_value integer not null
);
create table public.governance_meetings (
  id uuid primary key, council_id uuid not null references public.governance_councils(id)
);
create table public.governance_motions (
  id uuid primary key, meeting_id uuid not null references public.governance_meetings(id)
);
create table public.organization_memberships (id uuid primary key, user_id uuid not null);
create table public.governance_council_members (
  id uuid primary key, council_id uuid not null references public.governance_councils(id), membership_id uuid not null references public.organization_memberships(id),
  is_voting_member boolean not null, status text not null
);
create table public.governance_meeting_participants (
  id uuid primary key, meeting_id uuid not null references public.governance_meetings(id),
  council_member_id uuid references public.governance_council_members(id),
  user_id uuid not null, participant_role text not null, status text not null
);
create table public.governance_votes (
  id uuid primary key default gen_random_uuid(), motion_id uuid not null references public.governance_motions(id),
  council_member_id uuid not null references public.governance_council_members(id), choice text not null,
  unique(motion_id,council_member_id)
);
create table public.governance_decisions (
  id uuid primary key default gen_random_uuid(), motion_id uuid not null unique references public.governance_motions(id),
  outcome text not null, yes_count integer not null, no_count integer not null,
  abstain_count integer not null, quorum_met boolean not null, decided_by uuid
);
create table public.governance_minutes (
  id uuid primary key default gen_random_uuid(), meeting_id uuid not null unique references public.governance_meetings(id),
  content text, status text not null, created_by uuid not null, approved_at timestamptz,
  approved_by uuid, updated_at timestamptz
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, actor_user_id uuid not null,
  action text not null, resource_type text not null, resource_id uuid not null, metadata jsonb not null
);
grant usage on schema public, auth, private to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
