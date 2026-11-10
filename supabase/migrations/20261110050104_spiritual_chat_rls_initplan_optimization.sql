begin;

-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- These predicates are semantically identical; this only enables RLS initplans.
drop policy if exists spiritual_chat_conversations_owner_select on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_select
  on public.spiritual_chat_conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists spiritual_chat_conversations_owner_insert on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_insert
  on public.spiritual_chat_conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists spiritual_chat_conversations_owner_update on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_update
  on public.spiritual_chat_conversations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists spiritual_chat_messages_owner_select on public.spiritual_chat_messages;
create policy spiritual_chat_messages_owner_select
  on public.spiritual_chat_messages
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.spiritual_chat_conversations c
      where c.id = spiritual_chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists spiritual_chat_messages_owner_insert on public.spiritual_chat_messages;
create policy spiritual_chat_messages_owner_insert
  on public.spiritual_chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.spiritual_chat_conversations c
      where c.id = spiritual_chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

commit;
