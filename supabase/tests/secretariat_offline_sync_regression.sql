\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_first jsonb;
  v_replay jsonb;
  v_updated jsonb;
  v_conflict jsonb;
  v_count integer;
begin
  v_first := public.sync_church_member_offline(
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'create',
    null,
    '{"first_name":"Ana","last_name":"Silva"}'::jsonb
  );
  v_replay := public.sync_church_member_offline(
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'create',
    null,
    '{"first_name":"Ana","last_name":"Silva"}'::jsonb
  );
  if v_first <> v_replay then raise exception 'Create replay did not return the original result'; end if;

  begin
    perform public.sync_church_member_offline(
      '22222222-2222-4222-8222-222222222222',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '33333333-3333-4333-8333-333333333333',
      'create',
      null,
      '{"first_name":"Different payload","last_name":"Silva"}'::jsonb
    );
    raise exception 'Changed payload unexpectedly reused an idempotency key';
  exception when unique_violation then
    null;
  end;

  if (select count(*) from public.church_member_records) <> 1 then
    raise exception 'Idempotent create inserted more than one member';
  end if;

  v_updated := public.sync_church_member_offline(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'update',
    1,
    '{"first_name":"Ana Maria"}'::jsonb
  );
  if v_updated->>'first_name' <> 'Ana Maria' or (v_updated->>'row_version')::bigint <> 2 then
    raise exception 'Expected version 1 update to produce version 2';
  end if;

  v_conflict := public.sync_church_member_offline(
    '55555555-5555-4555-8555-555555555555',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'update',
    1,
    '{"last_name":"Stale write"}'::jsonb
  );
  if v_conflict->>'sync_conflict' <> 'true' then
    raise exception 'Stale update did not return an explicit conflict';
  end if;
  if (v_conflict->'current'->>'row_version')::bigint <> 2 then
    raise exception 'Conflict response did not include current server version';
  end if;

  v_replay := public.sync_church_member_offline(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'update',
    1,
    '{"first_name":"Ana Maria"}'::jsonb
  );
  if v_replay <> v_updated then raise exception 'Update replay did not return the original result'; end if;

  select count(*) into v_count
  from public.church_member_records
  where id = '33333333-3333-4333-8333-333333333333'
    and first_name = 'Ana Maria'
    and last_name = 'Silva'
    and row_version = 2;
  if v_count <> 1 then raise exception 'Unexpected final member state after conflict and replay'; end if;
end;
$$;


  -- Authenticated users must not be able to forge or mutate idempotency receipts
  -- through direct table DML. Only sync_church_member_offline may write them.
  begin
    insert into public.zion_offline_operation_receipts (
      organization_id, actor_id, operation_id, entity_id, module_key, action, request_fingerprint, result
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777',
      'church.members', 'create', 'forged-fingerprint', '{"forged":true}'::jsonb
    );
    raise exception 'Direct receipt INSERT unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.zion_offline_operation_receipts
    set result = '{"forged":true}'::jsonb
    where actor_id = '11111111-1111-4111-8111-111111111111'
      and operation_id = '22222222-2222-4222-8222-222222222222';
    raise exception 'Direct receipt UPDATE unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  -- RPC replay remains functional after direct table writes are revoked.
  v_replay := public.sync_church_member_offline(
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'create',
    null,
    '{"first_name":"Ana","last_name":"Silva"}'::jsonb
  );
  if v_replay <> v_first then
    raise exception 'RPC replay failed after receipt write privileges were revoked';
  end if;

reset role;
