-- Enforce the voter-to-motion council boundary at the database layer.
alter table public.governance_votes enable row level security;

drop policy if exists gov_votes_select on public.governance_votes;
create policy gov_votes_select on public.governance_votes
for select to authenticated
using (
  exists (
    select 1
    from public.governance_motions m
    join public.governance_meetings gm on gm.id = m.meeting_id
    join public.governance_councils c on c.id = gm.council_id
    where m.id = governance_votes.motion_id
      and private.is_org_member(c.organization_id)
  )
);

drop policy if exists gov_votes_insert on public.governance_votes;
create policy gov_votes_insert on public.governance_votes
for insert to authenticated
with check (
  exists (
    select 1
    from public.governance_motions m
    join public.governance_meetings gm on gm.id = m.meeting_id
    join public.governance_councils c on c.id = gm.council_id
    join public.governance_council_members cm
      on cm.id = governance_votes.council_member_id
     and cm.council_id = c.id
    join public.organization_memberships om on om.id = cm.membership_id
    where m.id = governance_votes.motion_id
      and om.user_id = (select auth.uid())
      and cm.is_voting_member = true
      and cm.status = 'ACTIVE'
      and private.is_org_member(c.organization_id)
  )
);
