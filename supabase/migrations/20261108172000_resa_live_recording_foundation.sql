-- RESA Live: private storage and metadata foundation for persistent recordings.
-- LiveKit Egress uploads through S3-compatible credentials; no public bucket access is granted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resa-live-recordings',
  'resa-live-recordings',
  false,
  536870912,
  array['video/mp4']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.resa_live_recordings (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  egress_id text not null unique,
  object_path text not null unique,
  status text not null default 'starting'
    check (status in ('starting', 'recording', 'processing', 'ready', 'failed')),
  mime_type text not null default 'video/mp4' check (mime_type = 'video/mp4'),
  duration_seconds numeric(12,3),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resa_live_recordings_owner_recent_idx
  on public.resa_live_recordings(owner_id, created_at desc);
create index if not exists resa_live_recordings_live_recent_idx
  on public.resa_live_recordings(live_id, created_at desc);
create unique index if not exists resa_live_recordings_one_active_per_live_idx
  on public.resa_live_recordings(live_id)
  where status in ('starting', 'recording', 'processing');

alter table public.resa_live_recordings enable row level security;

drop policy if exists resa_live_recordings_owner_read on public.resa_live_recordings;
create policy resa_live_recordings_owner_read
on public.resa_live_recordings
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists resa_live_recordings_owner_insert on public.resa_live_recordings;
create policy resa_live_recordings_owner_insert
on public.resa_live_recordings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.resa_live_sessions live
    where live.id = resa_live_recordings.live_id
      and live.host_id = (select auth.uid())
  )
);

drop policy if exists resa_live_recordings_owner_update on public.resa_live_recordings;
create policy resa_live_recordings_owner_update
on public.resa_live_recordings
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Only the owner can obtain a signed download URL for objects stored under
-- {owner_id}/{live_id}/{recording_id}. No authenticated upload policy is added.
drop policy if exists resa_live_recordings_storage_owner_read on storage.objects;
create policy resa_live_recordings_storage_owner_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'resa-live-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on table public.resa_live_recordings is
  'Private RESA Live Egress recordings. Playback URLs must be short-lived signed URLs issued after owner authorization.';
