-- Seed a pre-existing missed call so the migration backfill is exercised.
insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000001', 'caller@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'receiver@example.test')
on conflict (id) do nothing;

insert into public.profiles(id, display_name, first_name, last_name) values
  ('10000000-0000-4000-8000-000000000001', 'Samuel Test', 'Samuel', 'Test'),
  ('10000000-0000-4000-8000-000000000002', 'Rute Test', 'Rute', 'Test')
on conflict (id) do update set display_name = excluded.display_name;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);

insert into public.resa_conversations(id, created_by, kind, title)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'direct',
  'Conversa de teste'
)
on conflict (id) do nothing;

insert into public.resa_conversation_members(conversation_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'member')
on conflict (conversation_id, user_id) do nothing;

insert into public.resa_calls(id, conversation_id, initiator_id, kind, status, created_at, ended_at)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'audio',
  'missed',
  now() - interval '2 minutes',
  now() - interval '1 minute'
)
on conflict (id) do nothing;

insert into public.notifications(user_id, type, title, body, channel, priority, data)
values (
  '10000000-0000-4000-8000-000000000002',
  'resa.call.audio',
  'Chamada de áudio recebida no RESA',
  'Tens uma chamada a chegar. Toca na notificação para abrir o RESA e atender.',
  'in_app',
  'critical',
  jsonb_build_object(
    'call_id', '30000000-0000-4000-8000-000000000001',
    'conversation_id', '20000000-0000-4000-8000-000000000001',
    'kind', 'audio',
    'initiator_id', '10000000-0000-4000-8000-000000000001',
    'call_status', 'ringing'
  )
);
