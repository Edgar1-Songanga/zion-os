begin;

-- The community creator is always a moderator, even before their membership
-- row is materialized. Keep this helper restricted to the private schema.
create or replace function private.resa_is_community_moderator(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $
  select exists (
    select 1 from public.resa_communities c
    where c.id = p_community_id and c.created_by = p_user_id
  ) or exists (
    select 1 from public.resa_community_members m
    where m.community_id = p_community_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role in ('owner','moderator')
  );
$;
grant execute on function private.resa_is_community_moderator(uuid,uuid) to authenticated;

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

-- A participant must already be allowed to see an event before responding.
-- This prevents guessing a private event UUID and becoming a participant to
-- bypass the event's audience policy.
drop policy if exists resa_event_participants_owner on public.resa_event_participants;
create policy resa_event_participants_read_self
on public.resa_event_participants
for select to authenticated
using (user_id = (select auth.uid()));

create policy resa_event_participants_insert_visible
on public.resa_event_participants
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.resa_events e
    where e.id = event_id
      and private.resa_can_view_content(e.created_by, e.visibility, e.community_id, e.organization_id)
  )
);

create policy resa_event_participants_update_visible
on public.resa_event_participants
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.resa_events e
    where e.id = event_id
      and (
        private.resa_can_view_content(e.created_by, e.visibility, e.community_id, e.organization_id)
        or (
          e.visibility = 'private'
          and exists (
            select 1 from public.resa_event_participants p
            where p.event_id = e.id and p.user_id = (select auth.uid())
          )
        )
      )
  )
);

create policy resa_event_participants_delete_self
on public.resa_event_participants
for delete to authenticated
using (user_id = (select auth.uid()));

commit;
