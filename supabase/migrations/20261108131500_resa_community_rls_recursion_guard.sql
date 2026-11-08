begin;

create or replace function private.resa_is_public_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select exists (
    select 1 from public.resa_communities c
    where c.id = p_community_id
      and c.status = 'active'
      and c.visibility = 'public'
  );
$function$;
revoke all on function private.resa_is_public_community(uuid) from public, anon;
grant execute on function private.resa_is_public_community(uuid) to authenticated;

create or replace function private.resa_is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select p_user_id = auth.uid() and exists (
    select 1 from public.resa_community_members m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$function$;
revoke all on function private.resa_is_community_member(uuid,uuid) from public, anon;
grant execute on function private.resa_is_community_member(uuid,uuid) to authenticated;

-- Avoid the circular RLS dependency between community discovery and
-- self-joining a public community. Both checks are evaluated by narrow,
-- actor-scoped SECURITY DEFINER helpers.
drop policy if exists resa_community_members_insert on public.resa_community_members;
create policy resa_community_members_insert
on public.resa_community_members
for insert to authenticated
with check (
  (
    user_id = (select auth.uid())
    and private.resa_is_public_community(community_id)
  )
  or private.resa_is_community_moderator(community_id, (select auth.uid()))
);

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
    or private.resa_is_community_member(id, (select auth.uid()))
  )
);

commit;
