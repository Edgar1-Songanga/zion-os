begin;

alter table public.resa_contents
  add column if not exists media_moderation_status text,
  add column if not exists media_moderation_provider text,
  add column if not exists media_moderation_score numeric(5,4),
  add column if not exists media_moderation_categories text[],
  add column if not exists media_moderated_at timestamptz;

alter table public.resa_contents
  add constraint resa_contents_media_moderation_status_check
  check (media_moderation_status is null or media_moderation_status = 'approved') not valid;

create unique index if not exists resa_contents_media_path_unique
  on public.resa_contents(media_path)
  where media_path is not null;

-- The uploader must be able to read its own quarantined object so the API can
-- create a short-lived URL for the classifier before a content row exists.
drop policy if exists "RESA private media owner moderation read" on storage.objects;
create policy "RESA private media owner moderation read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resa-content-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Direct authenticated inserts cannot attach media. New media publications must
-- pass the API's classifier gate and use the trusted service-role insertion path.
drop policy if exists resa_contents_owner_insert on public.resa_contents;
create policy resa_contents_owner_insert on public.resa_contents
for insert to authenticated
with check (
  private.resa_can_publish_content(author_id, visibility, community_id, organization_id)
  and media_type is null
  and media_url is null
  and media_path is null
  and media_moderation_status is null
  and media_moderation_provider is null
  and media_moderation_score is null
  and media_moderation_categories is null
  and media_moderated_at is null
);

create or replace function private.resa_guard_moderated_media_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.media_type is null and new.media_url is null and new.media_path is null then
    if new.media_moderation_status is not null
       or new.media_moderation_provider is not null
       or new.media_moderation_score is not null
       or new.media_moderation_categories is not null
       or new.media_moderated_at is not null then
      raise exception 'Media moderation metadata requires an approved private media attachment'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if auth.role() <> 'service_role'
     or new.media_type not in ('image','video')
     or new.media_url is not null
     or new.media_path is null
     or (storage.foldername(new.media_path))[1] <> new.author_id::text
     or new.media_moderation_status <> 'approved'
     or nullif(btrim(new.media_moderation_provider),'') is null
     or new.media_moderation_score is null
     or new.media_moderation_score < 0
     or new.media_moderation_score > 1
     or new.media_moderated_at is null then
    raise exception 'RESA media must be privately stored and approved by the trusted moderation service'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.resa_guard_moderated_media_write() from public, anon, authenticated;

drop trigger if exists trg_resa_guard_moderated_media_write on public.resa_contents;
create trigger trg_resa_guard_moderated_media_write
before insert or update of media_type, media_url, media_path,
  media_moderation_status, media_moderation_provider, media_moderation_score,
  media_moderation_categories, media_moderated_at
on public.resa_contents
for each row execute function private.resa_guard_moderated_media_write();

commit;
