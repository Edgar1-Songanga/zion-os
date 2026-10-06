create index if not exists resa_call_signals_recipient_fk_idx
  on public.resa_call_signals (recipient_id);
create index if not exists resa_call_signals_sender_fk_idx
  on public.resa_call_signals (sender_id);
create index if not exists resa_calls_initiator_fk_idx
  on public.resa_calls (initiator_id);
create index if not exists resa_notifications_actor_fk_idx
  on public.resa_notifications (actor_id);
create index if not exists resa_notifications_conversation_fk_idx
  on public.resa_notifications (conversation_id);
create index if not exists resa_notifications_message_fk_idx
  on public.resa_notifications (message_id);
create index if not exists resa_prayer_intercessions_user_fk_idx
  on public.resa_prayer_intercessions (user_id);

drop policy if exists "resa_calls_member_insert" on public.resa_calls;
create policy "resa_calls_member_insert" on public.resa_calls
  for insert to authenticated
  with check (
    (initiator_id = (select auth.uid()))
    and exists (
      select 1 from public.resa_conversation_members m
      where m.conversation_id = resa_calls.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_calls_member_select" on public.resa_calls;
create policy "resa_calls_member_select" on public.resa_calls
  for select to authenticated
  using (
    exists (
      select 1 from public.resa_conversation_members m
      where m.conversation_id = resa_calls.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_calls_member_update" on public.resa_calls;
create policy "resa_calls_member_update" on public.resa_calls
  for update to authenticated
  using (
    exists (
      select 1 from public.resa_conversation_members m
      where m.conversation_id = resa_calls.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_call_participants_insert" on public.resa_call_participants;
create policy "resa_call_participants_insert" on public.resa_call_participants
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_calls c
      join public.resa_conversation_members m on m.conversation_id = c.conversation_id
      where c.id = resa_call_participants.call_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_call_participants_select" on public.resa_call_participants;
create policy "resa_call_participants_select" on public.resa_call_participants
  for select to authenticated
  using (
    exists (
      select 1
      from public.resa_calls c
      join public.resa_conversation_members m on m.conversation_id = c.conversation_id
      where c.id = resa_call_participants.call_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_call_participants_update" on public.resa_call_participants;
create policy "resa_call_participants_update" on public.resa_call_participants
  for update to authenticated
  using (
    exists (
      select 1
      from public.resa_calls c
      join public.resa_conversation_members m on m.conversation_id = c.conversation_id
      where c.id = resa_call_participants.call_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (user_id = (select auth.uid()));

drop policy if exists "resa_call_signals_insert" on public.resa_call_signals;
create policy "resa_call_signals_insert" on public.resa_call_signals
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_calls c
      join public.resa_conversation_members m on m.conversation_id = c.conversation_id
      where c.id = resa_call_signals.call_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "resa_call_signals_select" on public.resa_call_signals;
create policy "resa_call_signals_select" on public.resa_call_signals
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or sender_id = (select auth.uid())
  );
