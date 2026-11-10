begin;

-- Enforce follow privacy at the database boundary as well as in the API.
-- This protects direct PostgREST writes and any future client implementation.
create or replace function private.resa_guard_follow_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  target_privacy jsonb;
begin
  -- Trusted database/service-role fixture and maintenance writes may have no JWT.
  -- An authenticated request without a user identity must never create a follow.
  if auth.uid() is null then
    if current_setting('role', true) = 'authenticated' then
      raise exception 'authenticated follow requires a user identity' using errcode = '42501';
    end if;
  elsif new.follower_id <> auth.uid() then
    raise exception 'follow actor must match authenticated user' using errcode = '42501';
  end if;

  if new.follower_id = new.followed_id then
    raise exception 'a member cannot follow their own profile' using errcode = '23514';
  end if;

  select p.privacy into target_privacy
  from public.profiles p
  where p.id = new.followed_id;

  if not found then
    raise exception 'follow target profile does not exist' using errcode = '23503';
  end if;

  if coalesce(target_privacy->>'profile_visibility', 'friends') = 'private' then
    raise exception 'private profiles do not accept automatic follows' using errcode = '42501';
  end if;

  if not private.resa_contact_allowed(new.follower_id, new.followed_id, 'follow_policy') then
    raise exception 'profile does not accept new followers' using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists resa_follows_privacy_guard on public.resa_follows;
create trigger resa_follows_privacy_guard
before insert or update of follower_id, followed_id on public.resa_follows
for each row execute function private.resa_guard_follow_privacy();

revoke all on function private.resa_guard_follow_privacy() from public, anon, authenticated;

commit;
