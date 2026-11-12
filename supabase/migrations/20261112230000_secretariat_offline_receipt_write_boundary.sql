-- Close direct client write access to the offline idempotency ledger.
-- The narrowly scoped RPC remains the only mutation path and still checks auth.uid(),
-- organization permission, operation identity and payload fingerprint on every call.
begin;

revoke insert, update, delete on table public.zion_offline_operation_receipts from authenticated;
grant select on table public.zion_offline_operation_receipts to authenticated;

drop policy if exists zion_offline_receipts_actor_insert on public.zion_offline_operation_receipts;
drop policy if exists zion_offline_receipts_actor_update on public.zion_offline_operation_receipts;

-- SECURITY DEFINER is necessary only because authenticated clients no longer have
-- table write grants. The function has a fixed empty search_path, fully-qualified
-- object names, no dynamic SQL, and explicit caller/org/permission validation.
alter function public.sync_church_member_offline(uuid, uuid, uuid, text, bigint, jsonb)
  security definer;

revoke all on function public.sync_church_member_offline(uuid, uuid, uuid, text, bigint, jsonb)
  from public, anon;
grant execute on function public.sync_church_member_offline(uuid, uuid, uuid, text, bigint, jsonb)
  to authenticated;

commit;
