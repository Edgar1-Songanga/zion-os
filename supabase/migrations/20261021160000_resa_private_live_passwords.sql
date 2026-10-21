-- Password-protect private RESA Live sessions without exposing password hashes.
alter table public.resa_live_sessions add column if not exists password_hash text;

create table if not exists public.resa_live_access_grants (
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (live_id, user_id)
);
alter table public.resa_live_access_grants enable row level security;
revoke all on public.resa_live_access_grants from anon, authenticated;

create or replace function public.resa_set_live_password(p_live_id uuid, p_password text)
returns boolean language plpgsql security definer
set search_path = public, private, extensions
as $$
begin
  if auth.uid() is null or length(p_password) < 8 or length(p_password) > 128 then return false; end if;
  update public.resa_live_sessions
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    where id = p_live_id and host_id = auth.uid() and visibility = 'private';
  return found;
end;
$$;

create or replace function public.resa_unlock_private_live(p_live_id uuid, p_password text)
returns boolean language plpgsql security definer
set search_path = public, private, extensions
as $$
declare saved_hash text;
begin
  if auth.uid() is null or length(p_password) < 1 or length(p_password) > 128 then return false; end if;
  select password_hash into saved_hash from public.resa_live_sessions
    where id = p_live_id and visibility = 'private' and status <> 'ended';
  if saved_hash is null or saved_hash <> extensions.crypt(p_password, saved_hash) then return false; end if;
  insert into public.resa_live_access_grants(live_id,user_id,expires_at)
    values (p_live_id, auth.uid(), now() + interval '4 hours')
    on conflict (live_id,user_id) do update set expires_at = excluded.expires_at, created_at = now();
  return true;
end;
$$;

create or replace function private.resa_has_live_access(p_live_id uuid)
returns boolean language sql stable security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.resa_live_sessions l
    where l.id = p_live_id and (
      l.host_id = auth.uid()
      or l.visibility in ('public','organization') and (
        l.visibility = 'public' or private.is_org_member(l.organization_id)
      )
      or l.visibility = 'private' and exists (
        select 1 from public.resa_live_access_grants g
        where g.live_id = l.id and g.user_id = auth.uid() and g.expires_at > now()
      )
    )
  );
$$;

grant execute on function public.resa_set_live_password(uuid,text) to authenticated;
grant execute on function public.resa_unlock_private_live(uuid,text) to authenticated;
grant execute on function private.resa_has_live_access(uuid) to authenticated;

drop policy if exists resa_live_public_read on public.resa_live_sessions;
create policy resa_live_public_read on public.resa_live_sessions for select to authenticated
using (
  visibility = 'public' or host_id = (select auth.uid())
  or (visibility = 'organization' and organization_id is not null and private.is_org_member(organization_id))
  or (visibility = 'private' and private.resa_has_live_access(id))
);

drop policy if exists resa_live_chat_read_active on public.resa_live_chat_messages;
create policy resa_live_chat_read_active on public.resa_live_chat_messages for select to authenticated
using (
  sender_id = (select auth.uid())
  or exists (
    select 1 from public.resa_live_sessions live
    where live.id = live_id and live.status = 'live' and private.resa_has_live_access(live.id)
  )
);

drop policy if exists resa_live_chat_insert_active on public.resa_live_chat_messages;
create policy resa_live_chat_insert_active on public.resa_live_chat_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.resa_live_sessions live
    where live.id = live_id and live.status = 'live' and private.resa_has_live_access(live.id)
  )
);
