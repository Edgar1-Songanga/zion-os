-- Add explicit user-controlled audible and haptic notification preferences.
-- This migration is proposed through a pull request; it is not applied to production here.
alter table public.notification_preferences
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists vibration_enabled boolean not null default true;

comment on column public.notification_preferences.sound_enabled is
  'Whether the client may play notification sounds when browser/device policy permits.';
comment on column public.notification_preferences.vibration_enabled is
  'Whether the client may request vibration when the device/browser supports it.';
