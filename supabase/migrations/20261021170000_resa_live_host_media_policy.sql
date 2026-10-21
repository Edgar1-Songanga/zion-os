ALTER TABLE public.resa_live_sessions
  ADD COLUMN IF NOT EXISTS attendee_publish_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendee_camera_on_join boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendee_microphone_on_join boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.resa_live_sessions.attendee_publish_allowed IS 'Whether admitted non-host attendees may publish audio/video tracks.';
COMMENT ON COLUMN public.resa_live_sessions.attendee_camera_on_join IS 'Requested initial camera state for attendees; browser permission and user gesture may override.';
COMMENT ON COLUMN public.resa_live_sessions.attendee_microphone_on_join IS 'Requested initial microphone state for attendees; browser permission and user gesture may override.';
