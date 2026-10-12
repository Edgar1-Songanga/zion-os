-- Idempotent in-app notifications for membership-transfer lifecycle changes.
-- Delivery is performed by the existing zion-jobs-worker notification.dispatch handler.
create or replace function private.enqueue_membership_transfer_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_status text := new.status;
  v_title text;
  v_body text;
  v_key text;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  v_title := case v_status
    when 'SUBMITTED' then 'Pedido de transferência submetido'
    when 'SOURCE_APPROVED' then 'A igreja de origem aprovou a transferência'
    when 'SOURCE_REJECTED' then 'O pedido de transferência foi recusado'
    when 'DESTINATION_REJECTED' then 'A igreja de destino recusou a transferência'
    when 'COMPLETED' then 'Transferência de membro concluída'
    when 'EXPIRED' then 'Pedido de transferência expirado'
    else 'Atualização do pedido de transferência'
  end;
  v_body := case v_status
    when 'SUBMITTED' then 'O seu pedido foi registado e aguarda análise da igreja de origem.'
    when 'SOURCE_APPROVED' then 'A igreja de origem aprovou o pedido. A igreja de destino deve agora analisar a transferência.'
    when 'SOURCE_REJECTED' then 'A igreja de origem recusou o pedido. Consulte a secretaria para obter esclarecimentos.'
    when 'DESTINATION_REJECTED' then 'A igreja de destino recusou o pedido. Consulte a secretaria para obter esclarecimentos.'
    when 'COMPLETED' then 'O seu rol de membro foi transferido para a igreja de destino.'
    when 'EXPIRED' then 'O pedido expirou sem ser concluído. Pode contactar a secretaria para orientação.'
    else 'O estado do seu pedido de transferência foi atualizado para ' || v_status || '.'
  end;
  v_key := 'membership-transfer:' || new.id::text || ':' || v_status;

  insert into public.zion_jobs(job_type,payload,idempotency_key,created_by)
  values ('notification.dispatch', jsonb_build_object(
    'user_id',new.requester_user_id,
    'type','membership_transfer_' || lower(v_status),
    'title',v_title,
    'body',v_body,
    'channel','in_app',
    'priority','normal',
    'data',jsonb_build_object('transfer_request_id',new.id,'status',v_status,
      'source_organization_id',new.source_organization_id,
      'destination_organization_id',new.destination_organization_id)
  ),v_key,coalesce(auth.uid(),new.requester_user_id))
  on conflict (idempotency_key) do nothing;
  return new;
end $$;

drop trigger if exists membership_transfer_notification_enqueue on public.membership_transfer_requests;
create trigger membership_transfer_notification_enqueue
after insert or update of status on public.membership_transfer_requests
for each row execute function private.enqueue_membership_transfer_notification();

revoke all on function private.enqueue_membership_transfer_notification() from public, anon, authenticated;
