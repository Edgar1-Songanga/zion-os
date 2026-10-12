-- ZION OS: membership transfer workflow and time-bound disciplinary measures.
-- Additive schema only. This migration is versioned in GitHub; it is NOT applied to production by this change.
create table if not exists public.membership_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  source_organization_id uuid not null references public.organizations(id) on delete restrict,
  destination_organization_id uuid not null references public.organizations(id) on delete restrict,
  reason text,
  status text not null default 'SUBMITTED'
    check (status in ('SUBMITTED','SOURCE_REVIEW','SOURCE_APPROVED','SOURCE_REJECTED','DESTINATION_REVIEW','DESTINATION_APPROVED','DESTINATION_REJECTED','COMPLETED','CANCELLED','EXPIRED')),
  source_decided_by uuid references auth.users(id) on delete set null,
  source_decided_at timestamptz,
  source_decision_note text,
  destination_decided_by uuid references auth.users(id) on delete set null,
  destination_decided_at timestamptz,
  destination_decision_note text,
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 months'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_transfer_distinct_orgs check (source_organization_id <> destination_organization_id)
);

create index if not exists idx_transfer_requester_recent
  on public.membership_transfer_requests(requester_user_id, created_at desc);
create index if not exists idx_transfer_source_status
  on public.membership_transfer_requests(source_organization_id, status, created_at desc);
create index if not exists idx_transfer_destination_status
  on public.membership_transfer_requests(destination_organization_id, status, created_at desc);
create index if not exists idx_transfer_expiry
  on public.membership_transfer_requests(expires_at) where status not in ('COMPLETED','CANCELLED','EXPIRED','SOURCE_REJECTED','DESTINATION_REJECTED');

alter table public.membership_transfer_requests enable row level security;

drop policy if exists membership_transfer_select_scoped on public.membership_transfer_requests;
create policy membership_transfer_select_scoped on public.membership_transfer_requests
for select to authenticated
using (
  requester_user_id = (select auth.uid())
  or private.has_org_permission(source_organization_id, 'membership.manage')
  or private.has_org_permission(destination_organization_id, 'membership.manage')
);

drop policy if exists membership_transfer_insert_self on public.membership_transfer_requests;
create policy membership_transfer_insert_self on public.membership_transfer_requests
for insert to authenticated
with check (
  requester_user_id = (select auth.uid())
  and status = 'SUBMITTED'
  and source_decided_by is null
  and destination_decided_by is null
  and completed_at is null
  and exists (
    select 1
    from public.organization_memberships m
    where m.id = membership_id
      and m.organization_id = source_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
  )
  and exists (
    select 1 from public.organizations destination
    where destination.id = destination_organization_id
      and destination.is_active = true
  )
  and source_organization_id <> destination_organization_id
);

-- Direct client updates are intentionally disabled. Workflow state changes must be performed
-- through narrowly scoped SECURITY DEFINER transition RPCs with explicit from/to state checks.
drop policy if exists membership_transfer_update_authorized on public.membership_transfer_requests;

create table if not exists public.membership_transfer_events (
  id uuid primary key default gen_random_uuid(),
  transfer_request_id uuid not null references public.membership_transfer_requests(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_transfer_events_history
  on public.membership_transfer_events(transfer_request_id, created_at asc);
alter table public.membership_transfer_events enable row level security;

drop policy if exists membership_transfer_events_read_scoped on public.membership_transfer_events;
create policy membership_transfer_events_read_scoped on public.membership_transfer_events
for select to authenticated
using (
  exists (
    select 1 from public.membership_transfer_requests r
    where r.id = transfer_request_id
      and (
        r.requester_user_id = (select auth.uid())
        or private.has_org_permission(r.source_organization_id, 'membership.manage')
        or private.has_org_permission(r.destination_organization_id, 'membership.manage')
      )
  )
);

-- Event history is append-only from trusted transition RPCs; authenticated clients cannot
-- insert fabricated events directly.
drop policy if exists membership_transfer_events_insert_scoped on public.membership_transfer_events;

-- Disciplinary case records are intentionally restricted to authorized membership officers.
-- A suspension/disciplinary measure must reference the official vote and minutes.
-- Early lifting must also preserve the authority, vote number and minutes reference.
-- These are required administrative evidence fields, not a substitute for validating the
-- church's applicable Manual and local/divisional policy.
-- Expiry is represented as a timestamp; consumers must treat a case as effective only
-- while status='ACTIVE' and (ends_at IS NULL OR ends_at > now()). No scheduled job is needed
-- to stop an expired case from being effective.
create table if not exists public.membership_disciplinary_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  imposed_by uuid not null references auth.users(id) on delete restrict,
  measure_type text not null check (measure_type in ('COUNSELING','RESTRICTION','SUSPENSION','OTHER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','LIFTED','REVOKED','EXPIRED')),
  reason_summary text not null,
  confidential_notes text,
  -- Governance evidence: identify the authorized decision and its official minutes.
  decision_vote_number text not null,
  meeting_minutes_reference text not null,
  decision_meeting_date date not null,
  decision_authority text not null check (decision_authority in ('CHURCH_BOARD','CHURCH_BUSINESS_MEETING','CONFERENCE_OR_MISSION','OTHER_AUTHORIZED_BODY')),
  decision_summary text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id) on delete set null,
  lifting_vote_number text,
  lifting_minutes_reference text,
  lifting_decision_date date,
  lifting_authority text check (lifting_authority is null or lifting_authority in ('CHURCH_BOARD','CHURCH_BUSINESS_MEETING','CONFERENCE_OR_MISSION','OTHER_AUTHORIZED_BODY')),
  lifting_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disciplinary_end_after_start check (ends_at is null or ends_at > starts_at),
  constraint disciplinary_lift_requires_governance_record check (
    status <> 'LIFTED'
    or (
      lifted_at is not null
      and lifted_by is not null
      and nullif(btrim(lifting_vote_number), '') is not null
      and nullif(btrim(lifting_minutes_reference), '') is not null
      and lifting_decision_date is not null
      and lifting_authority is not null
    )
  )
);
create index if not exists idx_disciplinary_membership_period
  on public.membership_disciplinary_cases(membership_id, starts_at desc, ends_at);
create index if not exists idx_disciplinary_active_org
  on public.membership_disciplinary_cases(organization_id, ends_at)
  where status = 'ACTIVE';

alter table public.membership_disciplinary_cases enable row level security;

drop policy if exists membership_discipline_select_authorized on public.membership_disciplinary_cases;
create policy membership_discipline_select_authorized on public.membership_disciplinary_cases
for select to authenticated
using (private.has_org_permission(organization_id, 'membership.manage'));

drop policy if exists membership_discipline_insert_authorized on public.membership_disciplinary_cases;
create policy membership_discipline_insert_authorized on public.membership_disciplinary_cases
for insert to authenticated
with check (
  imposed_by = (select auth.uid())
  and private.has_org_permission(organization_id, 'membership.manage')
  and exists (
    select 1 from public.organization_memberships m
    where m.id = membership_disciplinary_cases.membership_id
      and m.organization_id = membership_disciplinary_cases.organization_id
  )
);

-- Direct updates are intentionally disabled. A separate guarded RPC must validate lifting
-- evidence and the allowed status transition before modifying a disciplinary case.
drop policy if exists membership_discipline_update_authorized on public.membership_disciplinary_cases;

-- Safe read helper for eligibility checks: exposes no disciplinary reason or confidential notes.
create or replace function public.membership_has_effective_suspension(target_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce((select auth.uid()) is not null, false) and exists (
    select 1
    from public.membership_disciplinary_cases d
    join public.organization_memberships m on m.id = d.membership_id
    where d.membership_id = target_membership_id
      and d.measure_type = 'SUSPENSION'
      and d.status = 'ACTIVE'
      and d.starts_at <= now()
      and (d.ends_at is null or d.ends_at > now())
      and (
        m.user_id = (select auth.uid())
        or private.has_org_permission(d.organization_id, 'membership.manage')
      )
  );
$function$;

revoke all on function public.membership_has_effective_suspension(uuid) from public;
grant execute on function public.membership_has_effective_suspension(uuid) to authenticated;

-- NOTE: this foundation does not itself move a membership or block all recommendation surfaces.
-- Workflow APIs must implement source approval, receiving-church approval, final acceptance,
-- append-only events, notification fan-out, and call the helper from eligibility/recommendation
-- paths before this feature can be declared production-ready.
