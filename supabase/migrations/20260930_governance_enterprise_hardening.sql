-- Governance performance and secret-ballot hardening.
create index if not exists idx_gov_council_members_membership on public.governance_council_members(membership_id);
create index if not exists idx_gov_meetings_host on public.governance_meetings(host_user_id);
create index if not exists idx_gov_meetings_created_by on public.governance_meetings(created_by);
create index if not exists idx_gov_agenda_meeting on public.governance_agenda_items(meeting_id);
create index if not exists idx_gov_motions_agenda on public.governance_motions(agenda_item_id);
create index if not exists idx_gov_motions_proposed_by on public.governance_motions(proposed_by_membership_id);
create index if not exists idx_gov_votes_council_member on public.governance_votes(council_member_id);
create index if not exists idx_gov_decisions_decided_by on public.governance_decisions(decided_by);
create index if not exists idx_gov_minutes_created_by on public.governance_minutes(created_by);
create index if not exists idx_gov_minutes_approved_by on public.governance_minutes(approved_by);

create table if not exists public.governance_secret_ballots (
  id uuid primary key default gen_random_uuid(),
  motion_id uuid not null references public.governance_motions(id) on delete cascade,
  ballot_commitment text not null,
  choice text not null check (choice in ('YES','NO','ABSTAIN')),
  cast_at timestamptz not null default now(),
  unique(motion_id, ballot_commitment)
);
create index if not exists idx_gov_secret_ballots_motion on public.governance_secret_ballots(motion_id);
alter table public.governance_secret_ballots enable row level security;
drop policy if exists gov_secret_ballots_select on public.governance_secret_ballots;
create policy gov_secret_ballots_select on public.governance_secret_ballots
for select to authenticated
using (
  exists (
    select 1 from public.governance_motions m
    join public.governance_meetings gm on gm.id = m.meeting_id
    join public.governance_councils c on c.id = gm.council_id
    where m.id = governance_secret_ballots.motion_id
      and private.is_org_member(c.organization_id)
  )
);
-- No voter identity is stored with the secret ballot row.
