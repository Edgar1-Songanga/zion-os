-- Route incoming audio/video calls through the existing RESA notification and Web Push pipeline.
-- This preserves the existing call tables and only adds the missing notification dispatch.
create or replace function public.resa_notify_incoming_call()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_title text;
  v_body text;
begin
  if new.status <> 'ringing' then
    return new;
  end if;

  v_title := case
    when new.kind = 'video' then 'Videochamada recebida no RESA'
    else 'Chamada de áudio recebida no RESA'
  end;
  v_body := 'Tens uma chamada a chegar. Toca na notificação para abrir o RESA e atender.';

  insert into public.notifications (
    user_id, type, title, body, channel, priority, data
  )
  select
    member.user_id,
    case when new.kind = 'video' then 'resa.call.video' else 'resa.call.audio' end,
    v_title,
    v_body,
    'in_app',
    'critical',
    jsonb_build_object(
      'call_id', new.id,
      'conversation_id', new.conversation_id,
      'kind', new.kind,
      'initiator_id', new.initiator_id,
      'call_status', new.status
    )
  from public.resa_conversation_members as member
  where member.conversation_id = new.conversation_id
    and member.user_id <> new.initiator_id
  on conflict do nothing;

  return new;
exception when others then
  -- Never block call setup if notification delivery has a temporary problem.
  raise warning 'RESA incoming-call notification failed: %', sqlerrm;
  return new;
end;
$function$;

revoke all on function public.resa_notify_incoming_call() from public, anon, authenticated;

drop trigger if exists resa_calls_notify_incoming_call on public.resa_calls;
create trigger resa_calls_notify_incoming_call
  after insert on public.resa_calls
  for each row
  when (new.status = 'ringing')
  execute function public.resa_notify_incoming_call();
