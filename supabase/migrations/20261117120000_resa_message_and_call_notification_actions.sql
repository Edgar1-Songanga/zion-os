-- Make RESA message notifications read like conversation previews and keep call outcomes actionable.
-- Incoming-call notifications are created once on INSERT; this migration updates that same row
-- when the call is answered, missed, declined or ended so the inbox never accumulates stale ring alerts.

create or replace function public.resa_message_core_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_sender_name text;
begin
  select coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'Membro RESA'
  )
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  insert into public.notifications(user_id, type, title, body, channel, priority, data)
  select
    m.user_id,
    'resa.message',
    coalesce(v_sender_name, 'Membro RESA'),
    left(new.body, 240),
    'in_app',
    'normal',
    jsonb_build_object(
      'actor_id', new.sender_id,
      'conversation_id', new.conversation_id,
      'message_id', new.id
    )
  from public.resa_conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id;

  return new;
end;
$function$;

revoke all on function public.resa_message_core_notification() from public, anon, authenticated;

create or replace function public.resa_update_call_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'active' then
    v_title := 'Chamada atendida';
    v_body := case when new.kind = 'video'
      then 'A tua videochamada foi atendida.'
      else 'A tua chamada de áudio foi atendida.'
    end;
  elsif new.status = 'missed' then
    v_title := 'Chamada perdida';
    v_body := case when new.kind = 'video'
      then 'Não atendeste à videochamada. Podes voltar a ligar ou enviar uma mensagem.'
      else 'Não atendeste à chamada de áudio. Podes voltar a ligar ou enviar uma mensagem.'
    end;
  elsif new.status = 'declined' then
    v_title := 'Chamada recusada';
    v_body := 'A chamada foi recusada. Podes tentar novamente ou enviar uma mensagem.';
  elsif new.status = 'ended' then
    if old.status = 'active' then
      v_title := 'Chamada terminada';
      v_body := 'A chamada terminou. Podes voltar a ligar ou enviar uma mensagem.';
    else
      v_title := 'Chamada cancelada';
      v_body := 'A chamada foi cancelada antes de ser atendida.';
    end if;
  else
    return new;
  end if;

  update public.notifications n
  set
    title = v_title,
    body = v_body,
    data = coalesce(n.data, '{}'::jsonb) || jsonb_build_object(
      'call_status', new.status,
      'call_ended_at', new.ended_at
    )
  where n.type in ('resa.call.audio', 'resa.call.video')
    and n.data ->> 'call_id' = new.id::text;

  return new;
end;
$function$;

revoke all on function public.resa_update_call_notification() from public, anon, authenticated;

drop trigger if exists resa_calls_update_notification on public.resa_calls;
create trigger resa_calls_update_notification
  after update of status on public.resa_calls
  for each row
  when (old.status is distinct from new.status)
  execute function public.resa_update_call_notification();
