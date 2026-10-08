-- RESA messaging and calling convergence.
-- Allow the conversation creator to add the other member in the same insert
-- and ensure Realtime delivers conversation/message/call events.
drop policy if exists resa_conversation_members_insert on public.resa_conversation_members;
create policy resa_conversation_members_insert on public.resa_conversation_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.resa_conversations c
    where c.id = conversation_id and c.created_by = (select auth.uid())
  )
);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_conversations') then
    alter publication supabase_realtime add table public.resa_conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_conversation_members') then
    alter publication supabase_realtime add table public.resa_conversation_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_messages') then
    alter publication supabase_realtime add table public.resa_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_calls') then
    alter publication supabase_realtime add table public.resa_calls;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_call_signals') then
    alter publication supabase_realtime add table public.resa_call_signals;
  end if;
end $$;