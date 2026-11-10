begin;

-- A member may only mention someone from a publication they authored.
-- Enforce this in PostgreSQL as well as the NestJS service so direct REST
-- requests cannot forge mentions against another member's content.
create or replace function private.resa_guard_mention_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
declare
  v_author_id uuid;
  v_moderation_status text;
begin
  if auth.uid() is null or new.mentioned_by <> auth.uid() then
    raise exception 'mention actor must match authenticated user'
      using errcode = '42501';
  end if;

  select c.author_id, c.moderation_status
    into v_author_id, v_moderation_status
  from public.resa_contents c
  where c.id = new.content_id;

  if v_author_id is null then
    raise exception 'publication not found' using errcode = '23503';
  end if;

  if v_author_id <> auth.uid() then
    raise exception 'only the publication author may create mentions'
      using errcode = '42501';
  end if;

  if v_moderation_status <> 'active' then
    raise exception 'publication unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles p where p.id = new.mentioned_user_id) then
    raise exception 'mentioned profile not found' using errcode = '23503';
  end if;

  if private.resa_is_blocked_by_or_blocking(new.mentioned_user_id) then
    raise exception 'mentioned profile is unavailable' using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists resa_mentions_author_guard on public.resa_mentions;
create trigger resa_mentions_author_guard
before insert or update on public.resa_mentions
for each row execute function private.resa_guard_mention_insert();

drop policy if exists resa_mentions_insert on public.resa_mentions;
create policy resa_mentions_insert
on public.resa_mentions for insert to authenticated
with check (
  mentioned_by = (select auth.uid())
  and exists (
    select 1 from public.resa_contents c
    where c.id = content_id
      and c.author_id = (select auth.uid())
      and c.moderation_status = 'active'
  )
  and exists (
    select 1 from public.profiles p
    where p.id = mentioned_user_id
  )
);

revoke all on function private.resa_guard_mention_insert() from public, anon, authenticated;

commit;
