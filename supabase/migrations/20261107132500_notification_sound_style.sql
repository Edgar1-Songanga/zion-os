alter table public.notification_preferences
  add column if not exists sound_style text not null default 'soft'
  check (sound_style in ('soft', 'chime', 'classic', 'silent'));
