begin;

-- Messages: split the broad member policy so members can only mutate their own rows.
drop policy if exists resa_messages_member on public.resa_messages;

create policy resa_messages_member_select
  on public.resa_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.resa_conversation_members m
      where m.conversation_id = resa_messages.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

create policy resa_messages_member_insert
  on public.resa_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_conversation_members m
      where m.conversation_id = resa_messages.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

create policy resa_messages_author_update
  on public.resa_messages
  for update to authenticated
  using (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_conversation_members m
      where m.conversation_id = resa_messages.conversation_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_conversation_members m
      where m.conversation_id = resa_messages.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

create policy resa_messages_author_delete
  on public.resa_messages
  for delete to authenticated
  using (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.resa_conversation_members m
      where m.conversation_id = resa_messages.conversation_id
        and m.user_id = (select auth.uid())
    )
  );

-- Defence in depth: a message author cannot rewrite message identity or attribution.
create or replace function private.resa_guard_direct_message_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_kind text;
  v_target uuid;
begin
  if tg_op = 'UPDATE'
     and row(new.id, new.conversation_id, new.sender_id, new.parent_message_id, new.created_at)
       is distinct from
         row(old.id, old.conversation_id, old.sender_id, old.parent_message_id, old.created_at) then
    raise exception 'Message identity and attribution are immutable' using errcode = '42501';
  end if;

  if new.sender_id is distinct from (select auth.uid()) then
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

-- Call lifecycle: only the caller can cancel, only a recipient can decline,
-- only a joined recipient can answer, and only the server can mark a call missed.
create or replace function private.resa_guard_call_update()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if row(new.id, new.conversation_id, new.initiator_id, new.kind, new.created_at)
     is distinct from
     row(old.id, old.conversation_id, old.initiator_id, old.kind, old.created_at) then
    raise exception 'Call identity fields are immutable' using errcode = '42501';
  end if;

  if old.status = 'ringing' and new.status not in ('ringing', 'active', 'ended', 'missed', 'declined') then
    raise exception 'Invalid call transition from ringing' using errcode = '42501';
  elsif old.status = 'active' and new.status not in ('active', 'ended') then
    raise exception 'Invalid call transition from active' using errcode = '42501';
  elsif old.status in ('ended', 'missed', 'declined') and new.status is distinct from old.status then
    raise exception 'A finished call cannot be reopened' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'ringing' and new.status = 'active' then
      if v_actor is null
         or v_actor = old.initiator_id
         or not exists (
           select 1
           from public.resa_call_participants p
           where p.call_id = old.id
             and p.user_id = v_actor
             and p.status = 'joined'
             and p.joined_at is not null
         ) then
        raise exception 'Only a joined recipient can answer this call' using errcode = '42501';
      end if;
    elsif old.status = 'ringing' and new.status = 'declined' then
      if v_actor is null
         or v_actor = old.initiator_id
         or not exists (
           select 1
           from public.resa_conversation_members m
           where m.conversation_id = old.conversation_id
             and m.user_id = v_actor
         ) then
        raise exception 'Only a call recipient can decline this call' using errcode = '42501';
      end if;
    elsif old.status = 'ringing' and new.status = 'ended' then
      if v_actor is distinct from old.initiator_id then
        raise exception 'Only the call initiator can cancel a ringing call' using errcode = '42501';
      end if;
    elsif old.status = 'ringing' and new.status = 'missed' then
      if current_user not in ('postgres', 'service_role') then
        raise exception 'Only the server can expire an unanswered call' using errcode = '42501';
      end if;
    elsif old.status = 'active' and new.status = 'ended' then
      if v_actor is null
         or not exists (
           select 1
           from public.resa_call_participants p
           where p.call_id = old.id
             and p.user_id = v_actor
             and p.status = 'joined'
         ) then
        raise exception 'Only a joined call participant can end an active call' using errcode = '42501';
      end if;
    else
      raise exception 'Unauthorized call lifecycle transition' using errcode = '42501';
    end if;
  elsif row(new.answered_at, new.ended_at) is distinct from row(old.answered_at, old.ended_at) then
    raise exception 'Call lifecycle timestamps can only change with a status transition' using errcode = '42501';
  end if;

  if old.answered_at is not null and new.answered_at is distinct from old.answered_at then
    raise exception 'Call answer time is immutable once set' using errcode = '42501';
  end if;
  if new.status = 'active' and old.status = 'ringing' and new.answered_at is null then
    raise exception 'An answered call must have answered_at' using errcode = '42501';
  end if;
  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'Call end time is immutable once set' using errcode = '42501';
  end if;
  if new.status in ('ended', 'missed', 'declined') and old.status in ('ringing', 'active') and new.ended_at is null then
    raise exception 'A finished call must have ended_at' using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Participant state is self-managed only and follows the real call lifecycle.
create or replace function private.resa_guard_call_participant_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.call_id is distinct from old.call_id or new.user_id is distinct from old.user_id then
    raise exception 'Call participant identity is immutable' using errcode = '42501';
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Only the call participant can change their own state' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'ringing' and new.status in ('joined', 'declined'))
      or (old.status = 'joined' and new.status = 'left')
      or (old.status = 'left' and new.status = 'joined')
    ) then
      raise exception 'Invalid call participant state transition' using errcode = '42501';
    end if;

    if new.status = 'joined' then
      new.joined_at := clock_timestamp();
      new.left_at := null;
    elsif new.status = 'left' then
      new.left_at := clock_timestamp();
    end if;
  else
    new.joined_at := old.joined_at;
    new.left_at := old.left_at;
  end if;

  return new;
end;
$function$;

-- A caller may ask the database to expire only their own ringing call after 45s.
-- The SECURITY DEFINER function is the only client-accessible path to status=missed.
create or replace function public.expire_unanswered_resa_call(p_call_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.resa_calls
     set status = 'missed',
         ended_at = clock_timestamp()
   where id = p_call_id
     and initiator_id = auth.uid()
     and status = 'ringing'
     and created_at <= clock_timestamp() - interval '45 seconds';

  return found;
end;
$function$;

revoke all on function public.expire_unanswered_resa_call(uuid) from public, anon;
grant execute on function public.expire_unanswered_resa_call(uuid) to authenticated;

-- Meeting audit events: participants can report their own presence/invitation
-- lifecycle; administrative events require an accepted host or moderator.
drop policy if exists resa_group_meeting_events_insert on public.resa_group_meeting_events;

create policy resa_group_meeting_events_insert
  on public.resa_group_meeting_events
  for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and (
      (
        event_type = 'INVITATION_ACCEPTED'
        and exists (
          select 1 from public.resa_group_meeting_participants p
          where p.meeting_id = resa_group_meeting_events.meeting_id
            and p.user_id = (select auth.uid())
            and p.status = 'ACCEPTED'
        )
      )
      or (
        event_type = 'INVITATION_DECLINED'
        and exists (
          select 1 from public.resa_group_meeting_participants p
          where p.meeting_id = resa_group_meeting_events.meeting_id
            and p.user_id = (select auth.uid())
            and p.status = 'DECLINED'
        )
      )
      or (
        event_type = 'PARTICIPANT_JOINED'
        and exists (
          select 1 from public.resa_group_meeting_participants p
          where p.meeting_id = resa_group_meeting_events.meeting_id
            and p.user_id = (select auth.uid())
            and p.status = 'PRESENT'
        )
      )
      or (
        event_type = 'PARTICIPANT_LEFT'
        and exists (
          select 1 from public.resa_group_meeting_participants p
          where p.meeting_id = resa_group_meeting_events.meeting_id
            and p.user_id = (select auth.uid())
            and p.status = 'LEFT'
        )
      )
      or (
        event_type in (
          'MEETING_CREATED', 'INVITATION_SENT', 'PARTICIPANT_REMOVED',
          'ROLE_CHANGED', 'ROOM_OPENED', 'ROOM_CLOSED', 'ROOM_LOCKED',
          'ROOM_UNLOCKED', 'MODERATOR_ACTION', 'MEETING_ENDED'
        )
        and private.resa_is_group_meeting_moderator(
          resa_group_meeting_events.meeting_id, (select auth.uid())
        )
      )
      or (
        event_type in ('SCREEN_SHARE_STARTED', 'SCREEN_SHARE_STOPPED')
        and exists (
          select 1 from public.resa_group_meeting_participants p
          where p.meeting_id = resa_group_meeting_events.meeting_id
            and p.user_id = (select auth.uid())
            and p.status = 'PRESENT'
            and p.participant_role in ('HOST', 'MODERATOR', 'PRESENTER')
        )
      )
    )
  );

commit;
