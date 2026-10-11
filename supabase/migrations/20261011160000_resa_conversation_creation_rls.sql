-- Allow the creator to complete conversation creation without relying on a member row
-- that cannot exist until after the conversation row has been inserted.
-- Scope access strictly to the authenticated creator; existing owner/member policies remain.

drop policy if exists resa_conversations_creator_read on public.resa_conversations;
create policy resa_conversations_creator_read
on public.resa_conversations
for select to authenticated
using (created_by = (select auth.uid()));

drop policy if exists resa_conversation_members_creator_insert on public.resa_conversation_members;
create policy resa_conversation_members_creator_insert
on public.resa_conversation_members
for insert to authenticated
with check (
  user_id <> (select auth.uid())
  and exists (
    select 1
    from public.resa_conversations c
    where c.id = resa_conversation_members.conversation_id
      and c.created_by = (select auth.uid())
  )
);

comment on policy resa_conversations_creator_read on public.resa_conversations is
  'Lets a conversation creator read the newly inserted row before membership rows are written.';
comment on policy resa_conversation_members_creator_insert on public.resa_conversation_members is
  'Lets the authenticated creator add other members to a conversation they created; all other membership writes remain governed by existing policies.';