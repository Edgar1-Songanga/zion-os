-- Persist each user's explicit choice of notification sound and vibration.
-- Apply through the authorized Frame migration workflow; do not execute directly in production.
alter table public.notification_preferences
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists vibration_enabled boolean not null default true;

comment on column public.notification_preferences.sound_enabled is
  'Whether the client may play short notification tones when browser/device policy permits.';
comment on column public.notification_preferences.vibration_enabled is
  'Whether the client may request bounded vibration patterns when supported by the device.';
