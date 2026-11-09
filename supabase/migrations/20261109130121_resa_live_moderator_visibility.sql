-- Allow authenticated users who can already read a Live session to resolve
-- its trusted moderation identities. The parent live-session RLS policy remains
-- the access boundary: private sessions and their moderator roster stay private.
drop policy if exists resa_live_moderators_read on public.resa_live_moderators;

create policy resa_live_moderators_read
  on public.resa_live_moderators
  for select
  to authenticated
  using (
    moderator_user_id = (select auth.uid())
    or exists (
      select 1
      from public.resa_live_sessions live
      where live.id = resa_live_moderators.live_id
    )
  );
