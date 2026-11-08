# RESA Live — Persistent Recording Foundation

## Current behavior

The LiveStudio browser recorder uses MediaRecorder and downloads a WebM file to the host device. It is not a cloud recording, does not create a persistent replay in RESA, and cannot be relied on if the host browser/device closes or loses resources.

The API already uses LiveKit Egress for external RTMP streaming. Production environment currently has LiveKit Cloud connection settings, but no configured S3-compatible recording destination variables were found in the API project environment. Therefore server-side recording cannot be activated until storage credentials and endpoint configuration are provisioned.

## Foundation introduced

- Private Supabase Storage bucket: `resa-live-recordings`.
- 512 MiB per-object cap, MP4 only for the first release.
- `public.resa_live_recordings` metadata table with owner, LiveKit Egress ID, object path, lifecycle state, timestamps, duration and size.
- RLS restricts metadata to the live host.
- Storage SELECT policy permits only the owner folder `{owner_id}/...`; no public read and no client upload policy.
- Unique partial index prevents multiple active/processing recordings for the same Live session.

## Required server configuration (never expose in the browser)

Configure these as encrypted production environment variables on the API project only:

- `ZION_LIVEKIT_RECORDING_S3_ACCESS_KEY`
- `ZION_LIVEKIT_RECORDING_S3_SECRET`
- `ZION_LIVEKIT_RECORDING_S3_BUCKET=resa-live-recordings`
- `ZION_LIVEKIT_RECORDING_S3_REGION`
- `ZION_LIVEKIT_RECORDING_S3_ENDPOINT` (Supabase S3-compatible endpoint)
- `ZION_LIVEKIT_RECORDING_S3_FORCE_PATH_STYLE=true`

Generate S3 credentials in Supabase Storage settings. Do not send credentials in chat, commit them, or place them in Web project variables. Verify the region and endpoint from the Supabase project settings rather than assuming defaults.

## Next implementation steps

1. Configure and verify the S3-compatible credentials from the API runtime to the private bucket.
2. Add authenticated host-only Egress start/stop/status endpoints.
3. Persist Egress lifecycle and object metadata; reconcile completion after stop and on room shutdown.
4. Issue short-lived signed playback URLs only after owner/visibility authorization.
5. Add replay library and deletion/retention controls.
6. Replace the local-only recording control with explicit Cloud Recording state; keep local export as a separate fallback.
7. Test host, moderator, attendee, private live, failed upload, interrupted Egress, duplicate start/stop, and unauthorized replay access.

## Cost and safety

- Start with MP4 only and a 512 MiB file cap.
- Display recording indicator and consent notice to all participants before capture.
- Do not auto-record private lives.
- Do not publish replays externally without explicit host consent and participant rights checks.
- Add retention and deletion before opening recordings broadly.
- Monitor Egress minutes and Storage usage; do not silently enable unlimited recording.
