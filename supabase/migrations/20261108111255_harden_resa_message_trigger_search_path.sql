begin;

alter function private.resa_guard_direct_message_privacy()
  set search_path = pg_catalog, pg_temp;

commit;
