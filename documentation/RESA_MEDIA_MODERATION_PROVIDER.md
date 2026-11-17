# RESA media moderation provider

## Security contract

New feed media is uploaded to the private Supabase Storage bucket `resa-content-private`. The browser cannot create a public media URL. The API creates a short-lived signed source URL and calls the configured classifier at `POST {RESA_MEDIA_MODERATION_URL}/v1/moderate`.

The classifier must:
- Authenticate with the bearer secret configured as `RESA_MEDIA_MODERATION_SECRET`.
- Download and inspect the source URL without logging or retaining it.
- Return JSON with `decision` (`approved`, `rejected`, or `review`), `confidence` (0–1), `provider`, `categories` (string array), `detected_mime_type` (the actual decoded MIME type), and `bytes_processed` (the exact source size). The API compares the decoded MIME and byte count with the upload metadata; mismatches fail closed.
- For video, decode the complete duration and inspect frames at intervals no greater than one second. Return `frames_analyzed` and `coverage_ratio` (0–1). The API rejects a result with less than 90% coverage.
- Treat explicit sexual nudity and pornographic content as `rejected`; ambiguous, low-confidence, or out-of-scope content as `review`. Do not classify solely by skin exposure.
- Return a non-2xx response or time out on processing failure. The API fails closed.

The API signs a 10-minute, user/path/type-bound moderation proof. The proof is verified before content insertion. Media publication uses the Supabase service-role key only after the authenticated user, private object namespace, media type and proof are verified. The database also denies direct authenticated media inserts and requires the trusted service role for media writes.

## Required environment configuration

- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role JWT. Never expose with a `NEXT_PUBLIC_` prefix.
- `RESA_MEDIA_MODERATION_URL`: private HTTPS base URL of the self-hosted moderation worker.
- `RESA_MEDIA_MODERATION_SECRET`: high-entropy bearer secret shared with that worker.
- `RESA_MEDIA_MODERATION_TOKEN_SECRET`: independent random secret of at least 32 characters for signing API moderation proofs.

No default provider is assumed. If any required service is absent, media publication remains blocked; text-only posts continue to work.

## Supabase Storage prerequisite

Create `resa-content-private` as a **private** bucket, 50 MiB maximum, with JPEG, PNG, WebP, MP4, WebM and QuickTime MIME types. Animated GIF is deliberately excluded until the worker can inspect every frame. Apply the existing migration `20261108223000_resa_private_content_storage_foundation.sql` and this gate migration. Do not make this bucket public and do not create it by directly writing `storage.buckets`.

## Operational controls

Keep moderation event metadata (provider, confidence, categories and timestamp) on the content record. Do not persist signed source URLs or raw media in logs. Review decisions must be routed to a human moderation queue before any publication path is offered. Rejected uploads should be deleted from private storage; orphan cleanup should be run periodically for abandoned uploads.
