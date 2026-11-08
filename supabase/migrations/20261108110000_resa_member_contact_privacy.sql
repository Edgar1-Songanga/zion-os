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

-- Contact and group-invite preferences are enforced inside the atomic database
-- operation as well as the API, so direct RPC calls cannot bypass profile choices.
create or replace function public.resa_create_conversation(
  p_member_ids uuid[],
  p_title text default null
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
  v_policy text;
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

  foreach v_target in array v_targets loop
    if cardinality(v_targets) = 1 then
      select coalesce(p.privacy->>'message_policy', 'everyone') into v_policy
      from public.profiles p where p.id = v_target;
    else
      select coalesce(p.privacy->>'group_invite_policy', 'everyone') into v_policy
      from public.profiles p where p.id = v_target;
    end if;
    v_policy := coalesce(v_policy, 'everyone');

    if v_policy = 'none' then
      raise exception 'recipient does not accept this contact type' using errcode = '42501';
    elsif v_policy = 'followers' and not exists (
      select 1 from public.resa_follows f where f.follower_id = v_actor and f.followed_id = v_target
    ) then
      raise exception 'recipient only accepts contacts from followers' using errcode = '42501';
    elsif v_policy = 'following' and not exists (
      select 1 from public.resa_follows f where f.follower_id = v_target and f.followed_id = v_actor
    ) then
      raise exception 'recipient only accepts contacts from profiles they follow' using errcode = '42501';
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

revoke all on function public.resa_create_conversation(uuid[], text) from public, anon;
grant execute on function public.resa_create_conversation(uuid[], text) to authenticated;

-- Enforce contact policy for messages in already-existing direct conversations.
create or replace function public.resa_guard_direct_message_privacy()
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
      select coalesce(p.privacy->>'message_policy', 'everyone')
        into v_policy
      from public.profiles p
      where p.id = v_target;
      v_policy := coalesce(v_policy, 'everyone');

      if v_policy = 'none' then
        raise exception 'recipient does not accept direct messages' using errcode = '42501';
      elsif v_policy = 'followers' and not exists (
        select 1 from public.resa_follows f
        where f.follower_id = new.sender_id and f.followed_id = v_target
      ) then
        raise exception 'recipient only accepts messages from followers' using errcode = '42501';
      elsif v_policy = 'following' and not exists (
        select 1 from public.resa_follows f
        where f.follower_id = v_target and f.followed_id = new.sender_id
      ) then
        raise exception 'recipient only accepts messages from profiles they follow' using errcode = '42501';
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_direct_message_privacy_guard on public.resa_messages;
create trigger resa_direct_message_privacy_guard
before insert on public.resa_messages
for each row execute function public.resa_guard_direct_message_privacy();

revoke all on function public.resa_guard_direct_message_privacy() from public, anon;

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
    join public.profiles p on p.id = recipient.user_id
    where recipient.conversation_id = resa_calls.conversation_id
      and recipient.user_id <> (select auth.uid())
      and (
        coalesce(p.privacy->>'call_policy', 'everyone') = 'none'
        or (
          coalesce(p.privacy->>'call_policy', 'everyone') = 'followers'
          and not exists (
            select 1 from public.resa_follows f
            where f.follower_id = (select auth.uid()) and f.followed_id = recipient.user_id
          )
        )
        or (
          coalesce(p.privacy->>'call_policy', 'everyone') = 'following'
          and not exists (
            select 1 from public.resa_follows f
            where f.follower_id = recipient.user_id and f.followed_id = (select auth.uid())
          )
        )
      )
  )
);

-- A member who disables new followers cannot be followed through direct table access.
drop policy if exists resa_follows_owner_insert on public.resa_follows;
create policy resa_follows_owner_insert on public.resa_follows
for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and coalesce((
    select p.privacy->>'follow_policy'
    from public.profiles p
    where p.id = resa_follows.followed_id
  ), 'auto') <> 'none'
);

commit;
