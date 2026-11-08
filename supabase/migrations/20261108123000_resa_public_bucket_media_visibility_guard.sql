begin;

create or replace function private.resa_enforce_public_media_visibility()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.visibility <> 'public'
     and (new.media_type is not null or new.media_url is not null or new.media_path is not null) then
    raise exception 'Media attachments require public visibility until private media delivery is enabled'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on function private.resa_enforce_public_media_visibility() from public, anon, authenticated;

drop trigger if exists trg_resa_public_media_visibility on public.resa_contents;
create trigger trg_resa_public_media_visibility
before insert or update of visibility, media_type, media_url, media_path
on public.resa_contents
for each row
execute function private.resa_enforce_public_media_visibility();

commit;
