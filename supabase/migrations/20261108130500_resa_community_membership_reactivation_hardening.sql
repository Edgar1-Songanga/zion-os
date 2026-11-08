begin;

-- A member may leave their own membership, but cannot reactivate it or
-- change their role. Community moderators retain membership-management rights.
drop policy if exists resa_community_members_update on public.resa_community_members;
create policy resa_community_members_update
on public.resa_community_members
for update to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_community_moderator(community_id, (select auth.uid()))
)
with check (
  private.resa_is_community_moderator(community_id, (select auth.uid()))
  or (
    user_id = (select auth.uid())
    and status = 'left'
    and role = 'member'
  )
);

commit;
