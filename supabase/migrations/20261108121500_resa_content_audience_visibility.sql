begin;

create or replace function private.resa_can_view_content(
  p_author_id uuid,
  p_visibility text,
  p_community_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
  select case
    when auth.uid() is null then false
    when p_author_id = auth.uid() then true
    when p_visibility = 'public' then true
    when p_visibility = 'followers' then exists (
      select 1 from public.resa_follows f
      where f.follower_id = auth.uid() and f.followed_id = p_author_id
    )
    when p_visibility = 'community' then p_community_id is not null and exists (
      select 1
      from public.resa_community_members m
      join public.resa_communities c on c.id = m.community_id
      where m.community_id = p_community_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and c.status = 'active'
    )
    when p_visibility = 'organization' then
      p_organization_id is not null and private.is_org_member(p_organization_id)
    else false
  end;
$function$;

create or replace function private.resa_can_publish_content(
  p_author_id uuid,
  p_visibility text,
  p_community_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
  select case
    when auth.uid() is null or p_author_id <> auth.uid() then false
    when p_visibility in ('public','followers','private') then true
    when p_visibility = 'community' then p_community_id is not null and exists (
      select 1
      from public.resa_communities c
      where c.id = p_community_id
        and c.status = 'active'
        and (
          c.created_by = auth.uid()
          or exists (
            select 1 from public.resa_community_members m
            where m.community_id = c.id
              and m.user_id = auth.uid()
              and m.status = 'active'
          )
        )
    )
    when p_visibility = 'organization' then
      p_organization_id is not null and private.is_org_member(p_organization_id)
    else false
  end;
$function$;

revoke all on function private.resa_can_view_content(uuid,text,uuid,uuid) from public, anon;
revoke all on function private.resa_can_publish_content(uuid,text,uuid,uuid) from public, anon;
grant execute on function private.resa_can_view_content(uuid,text,uuid,uuid) to authenticated;
grant execute on function private.resa_can_publish_content(uuid,text,uuid,uuid) to authenticated;

drop policy if exists resa_contents_public_read on public.resa_contents;
create policy resa_contents_audience_read
on public.resa_contents
for select to authenticated
using (
  private.resa_can_view_content(author_id, visibility, community_id, organization_id)
);

drop policy if exists resa_contents_owner_insert on public.resa_contents;
create policy resa_contents_owner_insert
on public.resa_contents
for insert to authenticated
with check (
  private.resa_can_publish_content(author_id, visibility, community_id, organization_id)
);

drop policy if exists resa_contents_owner_update on public.resa_contents;
create policy resa_contents_owner_update
on public.resa_contents
for update to authenticated
using (author_id = (select auth.uid()))
with check (
  private.resa_can_publish_content(author_id, visibility, community_id, organization_id)
);

commit;
