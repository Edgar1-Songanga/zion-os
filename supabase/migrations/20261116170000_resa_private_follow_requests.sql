begin;

create table if not exists public.resa_follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint resa_follow_requests_no_self check (requester_id <> target_id),
  constraint resa_follow_requests_unique_pair unique (requester_id, target_id)
);

create index if not exists resa_follow_requests_target_pending_idx
  on public.resa_follow_requests(target_id, created_at desc)
  where status = 'pending';
create index if not exists resa_follow_requests_requester_idx
  on public.resa_follow_requests(requester_id, created_at desc);

alter table public.resa_follow_requests enable row level security;
revoke all on public.resa_follow_requests from anon, authenticated;
grant select on public.resa_follow_requests to authenticated;

drop policy if exists resa_follow_requests_participant_read on public.resa_follow_requests;
create policy resa_follow_requests_participant_read
on public.resa_follow_requests for select to authenticated
using (requester_id = (select auth.uid()) or target_id = (select auth.uid()));

-- A pending request is created only for a private profile. The function is
-- transactional and idempotent: repeated taps return the existing request.
create or replace function public.resa_create_follow_request(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_privacy jsonb;
  v_request public.resa_follow_requests;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_target_id is null or p_target_id = v_actor then
    raise exception 'invalid follow request target' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.resa_user_blocks b
    where (b.blocker_id = v_actor and b.blocked_id = p_target_id)
       or (b.blocker_id = p_target_id and b.blocked_id = v_actor)
  ) then
    raise exception 'profile unavailable' using errcode = '42501';
  end if;

  select p.privacy into v_privacy
  from public.profiles p where p.id = p_target_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if coalesce(v_privacy->>'profile_visibility', 'community') <> 'private' then
    raise exception 'follow requests are only used for private profiles' using errcode = '22023';
  end if;
  if coalesce(v_privacy->>'follow_policy', 'auto') = 'none' then
    raise exception 'profile does not accept new followers' using errcode = '42501';
  end if;

  -- Serialize requests for this pair so concurrent taps cannot race the
  -- unique constraint or emit duplicate notifications.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || p_target_id::text, 0));

  select * into v_request
  from public.resa_follow_requests
  where requester_id = v_actor and target_id = p_target_id
  for update;

  if found then
    if v_request.status = 'pending' then
      return to_jsonb(v_request);
    end if;
    if v_request.status = 'accepted' and exists (
      select 1 from public.resa_follows f
      where f.follower_id = v_actor and f.followed_id = p_target_id
    ) then
      return to_jsonb(v_request);
    end if;
    -- If the requester unfollowed after a previous approval, allow a fresh
    -- request instead of leaving a stale accepted state permanently blocking it.
    update public.resa_follow_requests
      set status = 'pending', created_at = now(), updated_at = now(), decided_at = null
      where id = v_request.id
      returning * into v_request;
  else
    insert into public.resa_follow_requests(requester_id, target_id)
      values (v_actor, p_target_id)
      returning * into v_request;
  end if;

  insert into public.notifications(user_id, type, title, body, channel, priority, data)
  values (
    p_target_id, 'resa.follow_request', 'Novo pedido para seguir',
    'Alguém pediu para seguir o teu perfil privado.', 'in_app', 'normal',
    jsonb_build_object('request_id', v_request.id, 'actor_id', v_actor)
  );
  return to_jsonb(v_request);
end;
$function$;

create or replace function public.resa_decide_follow_request(p_request_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_request public.resa_follow_requests;
  v_privacy jsonb;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_decision not in ('accept','decline') then
    raise exception 'decision must be accept or decline' using errcode = '22023';
  end if;

  select * into v_request
  from public.resa_follow_requests
  where id = p_request_id and target_id = v_actor
  for update;
  if not found then
    raise exception 'follow request not found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'follow request is no longer pending' using errcode = '22023';
  end if;

  if p_decision = 'accept' then
    if exists (
      select 1 from public.resa_user_blocks b
      where (b.blocker_id = v_actor and b.blocked_id = v_request.requester_id)
         or (b.blocker_id = v_request.requester_id and b.blocked_id = v_actor)
    ) then
      raise exception 'profile relationship is blocked' using errcode = '42501';
    end if;

    select p.privacy into v_privacy from public.profiles p where p.id = v_actor;
    if not found
       or coalesce(v_privacy->>'profile_visibility', 'community') <> 'private'
       or coalesce(v_privacy->>'follow_policy', 'auto') = 'none' then
      raise exception 'profile no longer accepts this follow request' using errcode = '42501';
    end if;

    update public.resa_follow_requests
      set status = 'accepted', updated_at = now(), decided_at = now()
      where id = v_request.id returning * into v_request;

    insert into public.resa_follows(follower_id, followed_id)
      values (v_request.requester_id, v_request.target_id)
      on conflict (follower_id, followed_id) do nothing;
  else
    update public.resa_follow_requests
      set status = 'declined', updated_at = now(), decided_at = now()
      where id = v_request.id returning * into v_request;
  end if;

  insert into public.notifications(user_id, type, title, body, channel, priority, data)
  values (
    v_request.requester_id,
    case when p_decision = 'accept' then 'resa.follow_request.accepted' else 'resa.follow_request.declined' end,
    case when p_decision = 'accept' then 'Pedido aceite' else 'Pedido recusado' end,
    case when p_decision = 'accept' then 'O teu pedido para seguir foi aceite.' else 'O teu pedido para seguir não foi aceite.' end,
    'in_app', 'normal',
    jsonb_build_object('request_id', v_request.id, 'actor_id', v_actor)
  );
  return to_jsonb(v_request);
end;
$function$;

create or replace function public.resa_cancel_follow_request(p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  delete from public.resa_follow_requests
  where requester_id = v_actor and target_id = p_target_id and status = 'pending';
  return found;
end;
$function$;

revoke all on function public.resa_create_follow_request(uuid) from public, anon;
revoke all on function public.resa_decide_follow_request(uuid,text) from public, anon;
revoke all on function public.resa_cancel_follow_request(uuid) from public, anon;
grant execute on function public.resa_create_follow_request(uuid) to authenticated;
grant execute on function public.resa_decide_follow_request(uuid,text) to authenticated;
grant execute on function public.resa_cancel_follow_request(uuid) to authenticated;

-- Keep the existing follow privacy guard, but permit a private-profile edge
-- only after the profile owner has accepted that exact request.
create or replace function private.resa_guard_follow_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  target_privacy jsonb;
  accepted_by_owner boolean := false;
begin
  if auth.uid() is null then
    if current_setting('role', true) = 'authenticated' then
      raise exception 'authenticated follow requires a user identity' using errcode = '42501';
    end if;
  else
    accepted_by_owner := auth.uid() = new.followed_id and exists (
      select 1 from public.resa_follow_requests r
      where r.requester_id = new.follower_id
        and r.target_id = new.followed_id
        and r.status = 'accepted'
    );
    if new.follower_id <> auth.uid() and not accepted_by_owner then
      raise exception 'follow actor must match authenticated user or an accepted request owner' using errcode = '42501';
    end if;

    select p.privacy into target_privacy
    from public.profiles p where p.id = new.followed_id;
    if not found then
      raise exception 'follow target profile does not exist' using errcode = '23503';
    end if;

    if coalesce(target_privacy->>'profile_visibility', 'friends') = 'private'
       and not exists (
         select 1 from public.resa_follow_requests r
         where r.requester_id = new.follower_id
           and r.target_id = new.followed_id
           and r.status = 'accepted'
       ) then
      raise exception 'private profile requires an accepted follow request' using errcode = '42501';
    end if;

    if not accepted_by_owner
       and not private.resa_contact_allowed(new.follower_id, new.followed_id, 'follow_policy') then
      raise exception 'profile does not accept new followers' using errcode = '42501';
    end if;
    if accepted_by_owner and coalesce(target_privacy->>'follow_policy', 'auto') = 'none' then
      raise exception 'profile does not accept new followers' using errcode = '42501';
    end if;
  end if;

  if new.follower_id = new.followed_id then
    raise exception 'a member cannot follow their own profile' using errcode = '23514';
  end if;
  return new;
end;
$function$;

-- Blocking either side invalidates pending requests as well as follow edges.
create or replace function private.resa_cleanup_blocked_social_edges()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
begin
  delete from public.resa_follows f
  where (f.follower_id = new.blocker_id and f.followed_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.followed_id = new.blocker_id);
  delete from public.resa_follow_requests r
  where (r.requester_id = new.blocker_id and r.target_id = new.blocked_id)
     or (r.requester_id = new.blocked_id and r.target_id = new.blocker_id);
  return new;
end;
$function$;

commit;
