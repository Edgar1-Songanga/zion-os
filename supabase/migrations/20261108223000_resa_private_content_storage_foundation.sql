-- RESA private content storage foundation.
-- The legacy resa-media bucket remains public for avatars and existing assets.
-- Create resa-content-private as a PRIVATE bucket in Supabase Storage before
-- enabling the new upload flow. Bucket creation is intentionally performed
-- through Supabase Storage (Dashboard/API), never by writing storage.buckets.
-- Required bucket settings: 50 MiB max; JPEG, PNG, WebP, GIF, MP4, WebM,
-- QuickTime, MPEG audio, MP4 audio, OGG and WAV.

-- Uploads are allowed only into a path whose first segment is the uploader's
-- authenticated user ID. Use unique paths; overwriting is intentionally absent.
drop policy if exists "RESA private media owner upload" on storage.objects;
create policy "RESA private media owner upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resa-content-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- A stored object is readable only while its owning RESA content record is
-- visible to this viewer. The same audience, block and moderation rules used
-- by resa_contents are re-applied at the storage boundary.
drop policy if exists "RESA private media audience read" on storage.objects;
create policy "RESA private media audience read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resa-content-private'
  and exists (
    select 1
    from public.resa_contents c
    where c.media_path = storage.objects.name
      and private.resa_can_view_content(
        c.author_id,
        c.visibility,
        c.community_id,
        c.organization_id
      )
      and not private.resa_is_blocked_by_or_blocking(c.author_id)
      and (
        c.moderation_status = 'active'
        or c.author_id = (select auth.uid())
        or private.is_verified_zion_global_admin()
      )
  )
);

-- Authors may delete only objects under their own namespace. Moderation and
-- retention deletion will use a trusted server-side Storage operation.
drop policy if exists "RESA private media owner delete" on storage.objects;
create policy "RESA private media owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resa-content-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
