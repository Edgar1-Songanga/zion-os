\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'host@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'other@example.test')
on conflict (id) do nothing;

insert into public.resa_live_sessions (id, host_id, visibility, status)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'public', 'ended'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'public', 'ended')
on conflict (id) do nothing;

insert into public.resa_live_recordings (
  id, live_id, owner_id, egress_id, object_path, status
) values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'EGRESS_HOST_ONE',
  '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.mp4',
  'ready'
);

insert into storage.objects (bucket_id, name, owner_id)
values (
  'resa-live-recordings',
  '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.mp4',
  '10000000-0000-4000-8000-000000000001'
);

begin;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.resa_live_recordings) <> 1 then
    raise exception 'Recording owner must read their own recording metadata';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'resa-live-recordings') <> 1 then
    raise exception 'Recording owner must read their own private recording object';
  end if;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
do $$
begin
  if (select count(*) from public.resa_live_recordings) <> 0 then
    raise exception 'Other users must not read recording metadata';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'resa-live-recordings') <> 0 then
    raise exception 'Other users must not read private recording objects';
  end if;
  begin
    insert into public.resa_live_recordings (
      live_id, owner_id, egress_id, object_path, status
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'EGRESS_FORBIDDEN',
      '10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000001/forbidden.mp4',
      'starting'
    );
    raise exception 'Non-host must not create a recording for another host live';
  exception when insufficient_privilege then
    null;
  end;
end $$;
rollback;

do $$
begin
  if (select public from storage.buckets where id = 'resa-live-recordings') is distinct from false then
    raise exception 'RESA Live recording bucket must remain private';
  end if;
  if (select file_size_limit from storage.buckets where id = 'resa-live-recordings') <> 536870912 then
    raise exception 'RESA Live recording bucket size cap mismatch';
  end if;
end $$;
