\set ON_ERROR_STOP on
insert into public.audit_logs (action, resource_type, metadata)
values ('frame.migration.execution_started', 'frame_migration', '{"plan_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}');

do $$
declare
  v_id uuid;
begin
  select id into v_id from public.audit_logs limit 1;

  begin
    update public.audit_logs set action = 'tampered' where id = v_id;
    raise exception 'Expected UPDATE to be rejected by append-only guard';
  exception
    when sqlstate '55000' then null;
  end;

  begin
    delete from public.audit_logs where id = v_id;
    raise exception 'Expected DELETE to be rejected by append-only guard';
  exception
    when sqlstate '55000' then null;
  end;

  if not exists (
    select 1 from public.audit_logs
    where id = v_id and action = 'frame.migration.execution_started'
  ) then
    raise exception 'Audit row changed despite append-only guard';
  end if;
end $$;
