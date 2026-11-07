-- RESA Live audience visibility: enforce followers and selected-community membership in PostgreSQL/RLS.
alter table public.resa_live_sessions
  add column if not exists community_id uuid references public.resa_communities(id) on delete set null;

create index if not exists resa_live_sessions_community_idx
  on public.resa_live_sessions(community_id, status, created_at desc)
  where community_id is not null;

create or replace function private.resa_has_live_access(p_live_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.resa_live_sessions l
    where l.id = p_live_id
      and (
        l.host_id = auth.uid()
        or l.visibility = 'public'
        or (
          l.visibility = 'followers'
          and exists (
            select 1 from public.resa_follows f
            where f.follower_id = auth.uid()
              and f.followed_id = l.host_id
          )
        )
        or (
          l.visibility = 'community'
          and l.community_id is not null
          and (
            exists (
              select 1 from public.resa_community_members m
              where m.community_id = l.community_id
                and m.user_id = auth.uid()
                and m.status = 'active'
            )
            or exists (
              select 1 from public.resa_communities c
              where c.id = l.community_id
                and c.created_by = auth.uid()
                and c.status = 'active'
            )
          )
        )
        or (
          l.visibility = 'organization'
          and l.organization_id is not null
          and private.is_org_member(l.organization_id)
        )
        or (
          l.visibility = 'private'
          and exists (
            select 1 from public.resa_live_access_grants g
            where g.live_id = l.id
              and g.user_id = auth.uid()
              and g.expires_at > now()
          )
        )
      )
  );
$function$;

revoke all on function private.resa_has_live_access(uuid) from public, anon;
grant execute on function private.resa_has_live_access(uuid) to authenticated;

create or replace function public.resa_has_live_access(p_live_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select private.resa_has_live_access(p_live_id);
$function$;

revoke all on function public.resa_has_live_access(uuid) from public, anon;
grant execute on function public.resa_has_live_access(uuid) to authenticated;

drop policy if exists resa_live_public_read on public.resa_live_sessions;
create policy resa_live_public_read on public.resa_live_sessions
for select to authenticated
using (private.resa_has_live_access(id));

drop policy if exists resa_live_chat_read_active on public.resa_live_chat_messages;
create policy resa_live_chat_read_active on public.resa_live_chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.resa_live_sessions live
    where live.id = resa_live_chat_messages.live_id
      and live.status = 'live'
      and private.resa_has_live_access(live.id)
  )
);

drop policy if exists resa_live_chat_insert_active on public.resa_live_chat_messages;
create policy resa_live_chat_insert_active on public.resa_live_chat_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.resa_live_sessions live
    where live.id = resa_live_chat_messages.live_id
      and live.status = 'live'
      and private.resa_has_live_access(live.id)
  )
);
