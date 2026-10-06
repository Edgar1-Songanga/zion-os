create schema if not exists private;

create or replace function private.resa_is_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resa_community_members m
    where m.community_id = p_community_id
      and m.user_id = p_user_id
      and m.role in ('owner', 'moderator')
      and m.status = 'active'
  );
$$;

revoke execute on function private.resa_is_community_moderator(uuid, uuid) from public;
revoke execute on function private.resa_is_community_moderator(uuid, uuid) from anon;
grant execute on function private.resa_is_community_moderator(uuid, uuid) to authenticated;

drop policy if exists resa_communities_read on public.resa_communities;
create policy resa_communities_read
on public.resa_communities
for select to authenticated
using (
  status = 'active'
  and (
    visibility = 'public'
    or created_by = (select auth.uid())
    or (select private.resa_is_community_moderator(id, (select auth.uid())))
  )
);

drop policy if exists resa_community_members_read on public.resa_community_members;
create policy resa_community_members_read
on public.resa_community_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.resa_is_community_moderator(community_id, (select auth.uid())))
);

drop policy if exists resa_community_members_update on public.resa_community_members;
create policy resa_community_members_update
on public.resa_community_members
for update to authenticated
using (
  user_id = (select auth.uid())
  or (select private.resa_is_community_moderator(community_id, (select auth.uid())))
)
with check (
  user_id = (select auth.uid())
  or (select private.resa_is_community_moderator(community_id, (select auth.uid())))
);
