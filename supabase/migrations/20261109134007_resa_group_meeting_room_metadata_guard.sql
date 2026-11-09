create or replace function private.resa_group_meeting_room_guard_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_meeting_status text;
begin
  if row(
    new.meeting_id,
    new.channel_name,
    new.provider,
    new.provider_room_id,
    new.provider_room_url,
    new.max_participants,
    new.created_at
  ) is distinct from row(
    old.meeting_id,
    old.channel_name,
    old.provider,
    old.provider_room_id,
    old.provider_room_url,
    old.max_participants,
    old.created_at
  ) then
    raise exception 'Group meeting room identity and provider metadata are immutable' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    select m.status
      into v_meeting_status
      from public.resa_group_meetings m
     where m.id = old.meeting_id;

    if not (
      (old.status = 'READY' and new.status = 'OPEN' and v_meeting_status = 'SCHEDULED')
      or (old.status = 'OPEN' and new.status = 'READY' and v_meeting_status = 'SCHEDULED')
      or (old.status = 'OPEN' and new.status = 'CLOSED' and v_meeting_status = 'OPEN')
    ) then
      raise exception 'Invalid group meeting room status transition' using errcode = '42501';
    end if;
  end if;

  if new.status = 'CLOSED' and not new.locked then
    raise exception 'A closed group meeting room must remain locked' using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists resa_group_meeting_rooms_guard_update
  on public.resa_group_meeting_rooms;

create trigger resa_group_meeting_rooms_guard_update
before update on public.resa_group_meeting_rooms
for each row execute function private.resa_group_meeting_room_guard_update();
