begin;

-- Close historical ringing calls that predate the original expiry worker.
-- They must never be presented as incoming calls again.
update public.resa_calls
set status = 'missed',
    ended_at = coalesce(ended_at, clock_timestamp())
where status = 'ringing'
  and created_at <= clock_timestamp() - interval '60 seconds';

-- Call alerts are transient. Remove the inbox record when the call is answered,
-- declined, ended, or marked missed.
create or replace function private.resa_clear_call_alert_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if new.status is distinct from old.status
     and old.status = 'ringing'
     and new.status <> 'ringing' then
    delete from public.notifications
    where type in ('resa.call.audio', 'resa.call.video')
      and data ->> 'call_id' = old.id::text;
  end if;
  return new;
end;
$function$;

revoke all on function private.resa_clear_call_alert_notifications() from public, anon, authenticated;

drop trigger if exists resa_calls_clear_call_alert_notifications on public.resa_calls;
create trigger resa_calls_clear_call_alert_notifications
  after update of status on public.resa_calls
  for each row
  when (old.status = 'ringing' and new.status <> 'ringing')
  execute function private.resa_clear_call_alert_notifications();

-- Remove historical call alerts that no longer represent an unanswered call.
delete from public.notifications n
where n.type in ('resa.call.audio', 'resa.call.video')
  and not exists (
    select 1
    from public.resa_calls c
    where c.id::text = n.data ->> 'call_id'
      and c.status = 'ringing'
      and c.created_at > clock_timestamp() - interval '60 seconds'
  );

commit;
