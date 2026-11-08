\set ON_ERROR_STOP on

do $test$
declare
  v_missing text[];
begin
  select array_agg(expected.index_name)
  into v_missing
  from (values
    ('resa_live_password_attempts_user_id_idx'),
    ('resa_live_access_grants_user_id_idx'),
    ('resa_live_chat_messages_sender_id_idx'),
    ('resa_live_moderators_granted_by_idx')
  ) as expected(index_name)
  where not exists (
    select 1
    from pg_indexes actual
    where actual.indexname = expected.index_name
  );

  if coalesce(array_length(v_missing, 1), 0) > 0 then
    raise exception 'Missing RESA live foreign-key indexes: %', array_to_string(v_missing, ', ');
  end if;
end;
$test$;
