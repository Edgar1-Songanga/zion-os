begin;

-- Members of private and organization-scoped communities must be able to
-- discover and open their own spaces. Non-members must remain excluded.
drop policy if exists resa_communities_read on public.resa_communities;
create policy resa_communities_read
on public.resa_communities
for select to authenticated
using (
  status = 'active'
  and (
    visibility = 'public'
    or created_by = (select auth.uid())
    or private.resa_is_community_moderator(id, (select auth.uid()))
    or exists (
      select 1
      from public.resa_community_members m
      where m.community_id = resa_communities.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  )
);

commit;
