begin;

-- Public communities can be joined directly. Private and organization-scoped
-- communities require an invitation or moderator action; a member cannot
-- self-insert into those spaces by calling the REST endpoint directly.
drop policy if exists resa_community_members_insert on public.resa_community_members;
create policy resa_community_members_insert
on public.resa_community_members
for insert to authenticated
with check (
  (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_communities c
      where c.id = community_id
        and c.status = 'active'
        and c.visibility = 'public'
    )
  )
  or private.resa_is_community_moderator(community_id, (select auth.uid()))
);

-- Event visibility must follow the same audience contract as RESA content.
-- Private events remain readable only to the creator and explicit participants.
drop policy if exists resa_events_read on public.resa_events;
create policy resa_events_read
on public.resa_events
for select to authenticated
using (
  private.resa_can_view_content(created_by, visibility, community_id, organization_id)
  or (
    visibility = 'private'
    and exists (
      select 1 from public.resa_event_participants p
      where p.event_id = resa_events.id
        and p.user_id = (select auth.uid())
    )
  )
);

drop policy if exists resa_events_insert on public.resa_events;
create policy resa_events_insert
on public.resa_events
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and visibility in ('public','followers','community','organization')
  and private.resa_can_publish_content(created_by, visibility, community_id, organization_id)
);

drop policy if exists resa_events_update on public.resa_events;
create policy resa_events_update
on public.resa_events
for update to authenticated
using (created_by = (select auth.uid()))
with check (
  created_by = (select auth.uid())
  and visibility in ('public','followers','community','organization')
  and private.resa_can_publish_content(created_by, visibility, community_id, organization_id)
);

commit;
