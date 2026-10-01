drop policy if exists gov_votes_insert on public.governance_votes;
create policy gov_votes_insert on public.governance_votes
for insert to authenticated
with check (
  exists (
    select 1
    from governance_council_members cm
    join governance_councils c on c.id=cm.council_id
    join organization_memberships om on om.id=cm.membership_id
    where cm.id=governance_votes.council_member_id
      and om.user_id=(select auth.uid())
      and cm.is_voting_member
      and private.is_org_member(c.organization_id)
  )
);
