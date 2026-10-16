-- Allow authenticated participants to identify other members of conversations they belong to.
-- The SECURITY DEFINER helper avoids recursive RLS evaluation on the membership table.
create or replace function private.resa_is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select exists (
    select 1
    from public.resa_conversation_members m
    where m.conversation_id = p_conversation_id
      and m.user_id = p_user_id
  );
$function$;

revoke all on function private.resa_is_conversation_member(uuid, uuid) from public, anon;
grant execute on function private.resa_is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists resa_conversation_members_self on public.resa_conversation_members;
create policy resa_conversation_members_self
on public.resa_conversation_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.resa_is_conversation_member(conversation_id, (select auth.uid()))
);

comment on function private.resa_is_conversation_member(uuid, uuid) is
  'Returns whether a user belongs to a RESA conversation; used to scope participant identity visibility to shared conversations.';
