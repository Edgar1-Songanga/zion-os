-- RESA messaging, calling and live-realtime convergence.

-- A conversation creator may add participants while establishing a conversation.
drop policy if exists resa_conversation_members_insert on public.resa_conversation_members;
create policy resa_conversation_members_insert on public.resa_conversation_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.resa_conversations c
    where c.id = conversation_id
      and c.created_by = (select auth.uid())
  )
);

-- Authorized organization staff may register real ministry records.
drop policy if exists ministries_admin_insert on public.ministries;
create policy ministries_admin_insert on public.ministries
for insert to authenticated
with check (private.has_org_permission(organization_id, 'organization.manage'));

-- Realtime is optional in local/test Postgres. Add existing tables only when
-- the managed publication exists; repeated execution is safe.
do $$
declare
  relation_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach relation_name in array array[
      'resa_conversations',
      'resa_conversation_members',
      'resa_messages',
      'resa_calls',
      'resa_call_signals'
    ] loop
      if to_regclass(format('public.%I', relation_name)) is not null
         and not exists (
           select 1
           from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = relation_name
         ) then
        execute format('alter publication supabase_realtime add table public.%I', relation_name);
      end if;
    end loop;
  end if;
end;
$$;
