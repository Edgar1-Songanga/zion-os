drop policy if exists spiritual_devotions_owner_select on public.spiritual_devotions;
create policy spiritual_devotions_owner_select
  on public.spiritual_devotions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists spiritual_devotions_owner_insert on public.spiritual_devotions;
create policy spiritual_devotions_owner_insert
  on public.spiritual_devotions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists spiritual_growth_events_owner_select on public.spiritual_growth_events;
create policy spiritual_growth_events_owner_select
  on public.spiritual_growth_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists spiritual_growth_events_owner_insert on public.spiritual_growth_events;
create policy spiritual_growth_events_owner_insert
  on public.spiritual_growth_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
