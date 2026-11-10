begin;

-- A reply must remain inside the same discussion thread. Otherwise a caller
-- could attach a comment from publication A beneath a comment from B.
-- This is enforced in PostgreSQL as well as the API service.
create or replace function private.resa_guard_content_interaction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid;
  v_author uuid;
  v_visibility text;
  v_community_id uuid;
  v_organization_id uuid;
  v_moderation_status text;
  v_parent_content_id uuid;
  v_parent_author_id uuid;
  v_parent_status text;
begin
  if tg_table_name = 'resa_comments' then
    v_actor := new.author_id;
  else
    v_actor := new.user_id;
  end if;

  if auth.uid() is null or v_actor <> auth.uid() then
    raise exception 'interaction actor must match authenticated user' using errcode = '42501';
  end if;

  select c.author_id, c.visibility, c.community_id, c.organization_id, c.moderation_status
    into v_author, v_visibility, v_community_id, v_organization_id, v_moderation_status
  from public.resa_contents c
  where c.id = new.content_id;

  if v_author is null then
    raise exception 'publication not found' using errcode = '23503';
  end if;

  if v_moderation_status <> 'active' then
    raise exception 'publication unavailable' using errcode = '42501';
  end if;

  if not private.resa_can_view_content(v_author, v_visibility, v_community_id, v_organization_id) then
    raise exception 'publication is outside your audience permissions' using errcode = '42501';
  end if;

  if private.resa_is_blocked_by_or_blocking(v_author) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;

  if tg_table_name = 'resa_comments' and new.parent_id is not null then
    select parent.content_id, parent.author_id, parent.status
      into v_parent_content_id, v_parent_author_id, v_parent_status
    from public.resa_comments parent
    where parent.id = new.parent_id;

    if v_parent_content_id is null
      or v_parent_content_id <> new.content_id
      or v_parent_status <> 'active' then
      raise exception 'reply parent must be active and belong to the same publication'
        using errcode = '23514';
    end if;

    if private.resa_is_blocked_by_or_blocking(v_parent_author_id) then
      raise exception 'reply parent is unavailable' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

commit;
