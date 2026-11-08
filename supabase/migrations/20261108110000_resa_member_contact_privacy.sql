begin;

-- Extend the existing canonical profile privacy document. Existing members retain
-- their current contact behaviour unless they explicitly change these settings.
alter table public.profiles
  alter column privacy set default '{
    "profile_visibility":"community",
    "bio_visibility":"community",
    "country_visibility":"community",
    "timezone_visibility":"private",
    "message_policy":"everyone",
    "call_policy":"everyone",
    "group_invite_policy":"everyone",
    "follow_policy":"auto"
  }'::jsonb;

update public.profiles
set privacy = coalesce(privacy, '{}'::jsonb) || jsonb_build_object(
  'message_policy', coalesce(privacy->>'message_policy', 'everyone'),
  'call_policy', coalesce(privacy->>'call_policy', 'everyone'),
  'group_invite_policy', coalesce(privacy->>'group_invite_policy', 'everyone'),
  'follow_policy', coalesce(privacy->>'follow_policy', 'auto')
)
where privacy is null
   or not (privacy ? 'message_policy')
   or not (privacy ? 'call_policy')
   or not (privacy ? 'group_invite_policy')
   or not (privacy ? 'follow_policy');

grant usage on schema private to authenticated;

create or replace function private.resa_contact_allowed(p_actor_id uuid, p_target_id uuid, p_policy_field text)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog, pg_temp
as $function$
declare v_policy text;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or p_target_id is null then return false; end if;
  if p_policy_field not in ('message_policy','call_policy','group_invite_policy','follow_policy') then return false; end if;
  select p.privacy->>p_policy_field into v_policy from public.profiles p where p.id = p_target_id;
  if not found then return false; end if;
  v_policy := coalesce(v_policy, case when p_policy_field = 'follow_policy' then 'auto' else 'everyone' end);
  if p_policy_field = 'follow_policy' then return v_policy <> 'none'; end if;
  if v_policy = 'everyone' then return true; end if;
  if v_policy = 'none' then return false; end if;
  if v_policy = 'followers' then return exists(select 1 from public.resa_follows f where f.follower_id = p_actor_id and f.followed_id = p_target_id); end if;
  if v_policy = 'following' then return exists(select 1 from public.resa_follows f where f.follower_id = p_target_id and f.followed_id = p_actor_id); end if;
  return false;
end;
$function$;
revoke all on function private.resa_contact_allowed(uuid,uuid,text) from public, anon;
grant execute on function private.resa_contact_allowed(uuid,uuid,text) to authenticated;

-- Contact and group-invite preferences are enforced inside the atomic database
-- operation as well as the API, so direct RPC calls cannot bypass profile choices.
drop function if exists public.resa_create_conversation(uuid[], text);

create or replace function public.resa_create_conversation(
  p_member_ids uuid[],
  p_title text default null,
  p_contact_type text default 'message'
)
returns public.resa_conversations
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_targets uuid[];
  v_target uuid;
  v_conversation public.resa_conversations%rowtype;
  v_policy_field text;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) < 1 or cardinality(p_member_ids) > 50 then
    raise exception 'one to fifty participant ids are required' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_member_ids) as supplied(user_id) where supplied.user_id is null) then
    raise exception 'participant ids cannot contain null' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct supplied.user_id order by supplied.user_id), '{}'::uuid[])
    into v_targets
  from unnest(p_member_ids) as supplied(user_id)
  where supplied.user_id <> v_actor;

  if cardinality(v_targets) < 1 or cardinality(v_targets) > 49 then
    raise exception 'a conversation requires one to forty-nine other participants' using errcode = '22023';
  end if;

  if cardinality(v_targets) = 1 then
    if p_contact_type not in ('message','call') then raise exception 'invalid direct conversation purpose' using errcode = '22023'; end if;
    v_policy_field := case when p_contact_type = 'call' then 'call_policy' else 'message_policy' end;
  else
    if p_contact_type <> 'message' then raise exception 'group conversations require message purpose' using errcode = '22023'; end if;
    v_policy_field := 'group_invite_policy';
  end if;

  foreach v_target in array v_targets loop
    if not private.resa_contact_allowed(v_actor, v_target, v_policy_field) then
      raise exception 'recipient does not accept this contact type' using errcode = '42501';
    end if;
  end loop;

  if cardinality(v_targets) = 1 then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'resa-direct:' || least(v_actor::text, v_targets[1]::text) || ':' || greatest(v_actor::text, v_targets[1]::text),
        0::bigint
      )
    );

    select c.* into v_conversation
    from public.resa_conversations c
    where c.kind = 'direct'
      and exists (select 1 from public.resa_conversation_members m where m.conversation_id = c.id and m.user_id = v_actor)
      and exists (select 1 from public.resa_conversation_members m where m.conversation_id = c.id and m.user_id = v_targets[1])
      and (select count(*) from public.resa_conversation_members m where m.conversation_id = c.id) = 2
    order by c.updated_at desc, c.created_at desc
    limit 1;

    if found then return v_conversation; end if;
  end if;

  insert into public.resa_conversations (kind, title, created_by)
  values (
    case when cardinality(v_targets) = 1 then 'direct' else 'group' end,
    nullif(left(btrim(coalesce(p_title, '')), 120), ''),
    v_actor
  )
  returning * into v_conversation;

  foreach v_target in array array_append(v_targets, v_actor) loop
    insert into public.resa_conversation_members (conversation_id, user_id, role)
    values (v_conversation.id, v_target, case when v_target = v_actor then 'owner' else 'member' end);
  end loop;

  return v_conversation;
end;
$function$;

revoke all on function public.resa_create_conversation(uuid[], text, text) from public, anon;
grant execute on function public.resa_create_conversation(uuid[], text, text) to authenticated;

-- Enforce contact policy for messages in already-existing direct conversations.
create or replace function private.resa_guard_direct_message_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_kind text;
  v_target uuid;
  v_policy text;
begin
  if new.sender_id <> (select auth.uid()) then
    raise exception 'message sender must match authenticated user' using errcode = '42501';
  end if;

  select kind into v_kind
  from public.resa_conversations
  where id = new.conversation_id;

  if v_kind = 'direct' then
    for v_target in
      select m.user_id
      from public.resa_conversation_members m
      where m.conversation_id = new.conversation_id
        and m.user_id <> new.sender_id
    loop
      if not private.resa_contact_allowed(new.sender_id, v_target, 'message_policy') then
        raise exception 'recipient does not accept direct messages' using errcode = '42501';
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_direct_message_privacy_guard on public.resa_messages;
create trigger resa_direct_message_privacy_guard
before insert on public.resa_messages
for each row execute function private.resa_guard_direct_message_privacy();

revoke all on function private.resa_guard_direct_message_privacy() from public, anon;

-- Safe profile projection: authenticated callers receive only fields permitted by the owner's privacy choices.
create or replace function private.resa_public_profile_internal(p_user_id uuid)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, bio text, country_code text, is_owner boolean, is_following boolean, message_allowed boolean, call_allowed boolean, group_invite_allowed boolean, follow_allowed boolean, private_locked boolean)
language sql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
  with viewer as (select auth.uid() as user_id), target as (
    select p.*, (p.id = viewer.user_id) as is_owner,
      exists(select 1 from public.resa_follows f where f.follower_id = viewer.user_id and f.followed_id = p.id) as is_following
    from public.profiles p cross join viewer
    where p.id = p_user_id and viewer.user_id is not null
  )
  select target.id,
    case when target.privacy->>'profile_visibility' = 'private' and not target.is_owner and not target.is_following then null else target.display_name end,
    case when target.privacy->>'profile_visibility' = 'private' and not target.is_owner and not target.is_following then null else target.first_name end,
    case when target.privacy->>'profile_visibility' = 'private' and not target.is_owner and not target.is_following then null else target.last_name end,
    case when target.privacy->>'profile_visibility' = 'private' and not target.is_owner and not target.is_following then null else target.avatar_url end,
    case when target.is_owner or (target.privacy->>'profile_visibility' is distinct from 'private' and coalesce(target.privacy->>'bio_visibility','community') in ('public','community')) then target.bio end,
    case when target.is_owner or (target.privacy->>'profile_visibility' is distinct from 'private' and coalesce(target.privacy->>'country_visibility','community') in ('public','community')) then target.country_code end,
    target.is_owner, target.is_following,
    not target.is_owner and target.privacy->>'profile_visibility' is distinct from 'private' and private.resa_contact_allowed((select user_id from viewer), target.id, 'message_policy'),
    not target.is_owner and target.privacy->>'profile_visibility' is distinct from 'private' and private.resa_contact_allowed((select user_id from viewer), target.id, 'call_policy'),
    not target.is_owner and target.privacy->>'profile_visibility' is distinct from 'private' and private.resa_contact_allowed((select user_id from viewer), target.id, 'group_invite_policy'),
    not target.is_owner and not target.is_following and private.resa_contact_allowed((select user_id from viewer), target.id, 'follow_policy'),
    target.privacy->>'profile_visibility' = 'private' and not target.is_owner and not target.is_following
  from target;
$function$;
create or replace function public.resa_public_profile(p_user_id uuid)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, bio text, country_code text, is_owner boolean, is_following boolean, message_allowed boolean, call_allowed boolean, group_invite_allowed boolean, follow_allowed boolean, private_locked boolean)
language sql stable security invoker
set search_path = pg_catalog, private, pg_temp
as $function$
  select * from private.resa_public_profile_internal(p_user_id);
$function$;
revoke all on function private.resa_public_profile_internal(uuid) from public, anon;
grant execute on function private.resa_public_profile_internal(uuid) to authenticated;
revoke all on function public.resa_public_profile(uuid) from public, anon;
grant execute on function public.resa_public_profile(uuid) to authenticated;

-- Group owners can add members directly, so enforce each recipient's group-invite preference on every membership insert.
create or replace function private.resa_guard_group_invite_privacy()
returns trigger language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $function$
declare v_kind text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if new.user_id <> auth.uid() then
    select c.kind into v_kind from public.resa_conversations c where c.id = new.conversation_id;
    if v_kind = 'group' and not private.resa_contact_allowed(auth.uid(), new.user_id, 'group_invite_policy') then
      raise exception 'recipient does not accept group invitations' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists resa_group_invite_privacy_guard on public.resa_conversation_members;
create trigger resa_group_invite_privacy_guard before insert on public.resa_conversation_members
for each row execute function private.resa_guard_group_invite_privacy();
revoke all on function private.resa_guard_group_invite_privacy() from public, anon;

-- Calls are inserted directly by the authenticated call client, so enforce the
-- recipient's call policy in RLS rather than relying on a hidden frontend button.
drop policy if exists "resa_calls_member_insert" on public.resa_calls;
create policy "resa_calls_member_insert" on public.resa_calls
for insert to authenticated
with check (
  initiator_id = (select auth.uid())
  and exists (
    select 1 from public.resa_conversation_members m
    where m.conversation_id = resa_calls.conversation_id
      and m.user_id = (select auth.uid())
  )
  and not exists (
    select 1
    from public.resa_conversation_members recipient
    where recipient.conversation_id = resa_calls.conversation_id
      and recipient.user_id <> (select auth.uid())
      and not private.resa_contact_allowed((select auth.uid()), recipient.user_id, 'call_policy')
  )
);

-- A member who disables new followers cannot be followed through direct table access.
drop policy if exists resa_follows_owner_insert on public.resa_follows;
create policy resa_follows_owner_insert on public.resa_follows
for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and private.resa_contact_allowed((select auth.uid()), followed_id, 'follow_policy')
);

commit;
