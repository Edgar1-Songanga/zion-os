-- Production RLS performance hardening.
-- Keep authentication calls cached per statement and add missing governance FK indexes.
create index if not exists idx_gov_councils_created_by on public.governance_councils(created_by);
create index if not exists idx_gov_councils_unit_id on public.governance_councils(unit_id);
create index if not exists idx_gov_participant_controls_updated_by on public.governance_meeting_participant_controls(updated_by);
create index if not exists idx_gov_meeting_participants_council_member on public.governance_meeting_participants(council_member_id);

drop policy if exists resa_follows_owner_read on public.resa_follows;
create policy resa_follows_owner_read on public.resa_follows for select to authenticated using (follower_id=(select auth.uid()) or followed_id=(select auth.uid()));
drop policy if exists resa_follows_owner_insert on public.resa_follows;
create policy resa_follows_owner_insert on public.resa_follows for insert to authenticated with check (follower_id=(select auth.uid()));
drop policy if exists resa_follows_owner_delete on public.resa_follows;
create policy resa_follows_owner_delete on public.resa_follows for delete to authenticated using (follower_id=(select auth.uid()));

drop policy if exists resa_contents_public_read on public.resa_contents;
create policy resa_contents_public_read on public.resa_contents for select to authenticated using (visibility='public' or author_id=(select auth.uid()));
drop policy if exists resa_contents_owner_insert on public.resa_contents;
create policy resa_contents_owner_insert on public.resa_contents for insert to authenticated with check (author_id=(select auth.uid()));
drop policy if exists resa_contents_owner_update on public.resa_contents;
create policy resa_contents_owner_update on public.resa_contents for update to authenticated using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));
drop policy if exists resa_contents_owner_delete on public.resa_contents;
create policy resa_contents_owner_delete on public.resa_contents for delete to authenticated using (author_id=(select auth.uid()));

drop policy if exists resa_live_public_read on public.resa_live_sessions;
create policy resa_live_public_read on public.resa_live_sessions for select to authenticated using (visibility='public' or host_id=(select auth.uid()));
drop policy if exists resa_live_host_insert on public.resa_live_sessions;
create policy resa_live_host_insert on public.resa_live_sessions for insert to authenticated with check (host_id=(select auth.uid()));
drop policy if exists resa_live_host_update on public.resa_live_sessions;
create policy resa_live_host_update on public.resa_live_sessions for update to authenticated using (host_id=(select auth.uid())) with check (host_id=(select auth.uid()));

drop policy if exists notification_preferences_owner_all on public.notification_preferences;
create policy notification_preferences_owner_all on public.notification_preferences for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
