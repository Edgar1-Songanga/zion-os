-- Expose a narrowly-scoped access check for the API to authorize private Live chat.
create or replace function public.resa_has_live_access(p_live_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.resa_has_live_access(p_live_id);
$$;

revoke all on function public.resa_has_live_access(uuid) from public, anon;
grant execute on function public.resa_has_live_access(uuid) to authenticated;
