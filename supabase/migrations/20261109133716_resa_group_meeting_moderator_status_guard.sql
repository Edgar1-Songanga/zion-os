create or replace function private.resa_group_meeting_participant_guard_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if row(new.meeting_id, new.user_id, new.invited_by, new.created_at)
     is distinct from row(old.meeting_id, old.user_id, old.invited_by, old.created_at) then
    raise exception 'Group meeting participant identity is immutable' using errcode = '42501';
  end if;

  if new.participant_role is distinct from old.participant_role then
    if old.participant_role = 'HOST' or new.participant_role = 'HOST' then
      raise exception 'The meeting host role is immutable' using errcode = '42501';
    end if;
    if old.participant_role = 'MODERATOR'
       and not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      raise exception 'Only the host can change another moderator role' using errcode = '42501';
    end if;
    if not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      if not private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid())
         or new.participant_role not in ('PRESENTER', 'PARTICIPANT', 'VIEWER') then
        raise exception 'Only the host can appoint moderators; moderators may grant presenter status' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.participant_role = 'HOST'
       and new.status in ('REMOVED', 'DECLINED') then
      raise exception 'The meeting host cannot be removed or decline the meeting' using errcode = '42501';
    end if;
    if old.participant_role = 'MODERATOR'
       and new.status = 'REMOVED'
       and not private.resa_is_group_meeting_host(old.meeting_id, auth.uid()) then
      raise exception 'Only the host can remove another moderator' using errcode = '42501';
    end if;

    if auth.uid() = old.user_id then
      if not (
        (old.status = 'INVITED' and new.status in ('ACCEPTED', 'DECLINED'))
        or (old.status = 'ACCEPTED' and new.status in ('PRESENT', 'LEFT'))
        or (old.status = 'PRESENT' and new.status = 'LEFT')
        or (old.status = 'LEFT' and new.status = 'PRESENT')
      ) then
        raise exception 'Not authorized to change this participant status' using errcode = '42501';
      end if;
    elsif private.resa_is_group_meeting_moderator(old.meeting_id, auth.uid()) then
      if new.status <> 'REMOVED' then
        raise exception 'Moderators may only remove participants through status updates' using errcode = '42501';
      end if;
    else
      raise exception 'Not authorized to change this participant status' using errcode = '42501';
    end if;
  end if;

  if new.status = 'PRESENT' and new.joined_at is null then
    raise exception 'A present participant must have joined_at' using errcode = '42501';
  end if;
  if new.status = 'PRESENT' and not exists (
    select 1 from public.resa_group_meetings m
    where m.id = new.meeting_id and m.status = 'OPEN'
  ) then
    raise exception 'Participants can only enter an open meeting' using errcode = '42501';
  end if;
  if new.status = 'LEFT' and old.status = 'PRESENT' and new.left_at is null then
    raise exception 'A leaving participant must have left_at' using errcode = '42501';
  end if;
  return new;
end;
$function$;
