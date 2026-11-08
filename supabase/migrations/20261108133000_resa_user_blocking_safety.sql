begin;

create table if not exists public.resa_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint resa_user_blocks_no_self_block check (blocker_id <> blocked_id)
);
create index if not exists resa_user_blocks_blocked_idx
  on public.resa_user_blocks(blocked_id, blocker_id);
alter table public.resa_user_blocks enable row level security;
grant select, insert, delete on public.resa_user_blocks to authenticated;

drop policy if exists resa_user_blocks_read_self on public.resa_user_blocks;
create policy resa_user_blocks_read_self
on public.resa_user_blocks for select to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists resa_user_blocks_insert_self on public.resa_user_blocks;
create policy resa_user_blocks_insert_self
on public.resa_user_blocks for insert to authenticated
with check (blocker_id = (select auth.uid()) and blocker_id <> blocked_id);

drop policy if exists resa_user_blocks_delete_self on public.resa_user_blocks;
create policy resa_user_blocks_delete_self
on public.resa_user_blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

create or replace function private.resa_cleanup_blocked_social_edges()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
begin
  delete from public.resa_follows f
  where (f.follower_id = new.blocker_id and f.followed_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.followed_id = new.blocker_id);
  return new;
end;
$function$;
drop trigger if exists resa_user_blocks_cleanup_follows on public.resa_user_blocks;
create trigger resa_user_blocks_cleanup_follows
after insert on public.resa_user_blocks
for each row execute function private.resa_cleanup_blocked_social_edges();

create or replace function private.resa_is_blocked_by_or_blocking(p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select auth.uid() is not null and p_target_id is not null and exists (
    select 1 from public.resa_user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_target_id)
       or (b.blocker_id = p_target_id and b.blocked_id = auth.uid())
  );
$function$;
revoke all on function private.resa_is_blocked_by_or_blocking(uuid) from public, anon;
grant execute on function private.resa_is_blocked_by_or_blocking(uuid) to authenticated;

create or replace function private.resa_contact_allowed(
  p_actor_id uuid,
  p_target_id uuid,
  p_policy_field text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_policy text;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or p_target_id is null then
    return false;
  end if;
  if p_policy_field not in ('message_policy','call_policy','group_invite_policy','follow_policy') then
    return false;
  end if;
  if exists (
    select 1 from public.resa_user_blocks b
    where (b.blocker_id = p_actor_id and b.blocked_id = p_target_id)
       or (b.blocker_id = p_target_id and b.blocked_id = p_actor_id)
  ) then
    return false;
  end if;
  select p.privacy->>p_policy_field into v_policy
  from public.profiles p where p.id = p_target_id;
  if not found then return false; end if;
  v_policy := coalesce(v_policy, case when p_policy_field = 'follow_policy' then 'auto' else 'everyone' end);
  if p_policy_field = 'follow_policy' then return v_policy <> 'none'; end if;
  if v_policy = 'everyone' then return true; end if;
  if v_policy = 'none' then return false; end if;
  if v_policy = 'followers' then
    return exists(select 1 from public.resa_follows f where f.follower_id = p_actor_id and f.followed_id = p_target_id);
  end if;
  if v_policy = 'following' then
    return exists(select 1 from public.resa_follows f where f.follower_id = p_target_id and f.followed_id = p_actor_id);
  end if;
  return false;
end;
$function$;

create or replace function private.resa_guard_group_invite_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if new.user_id <> auth.uid() then
    if private.resa_is_blocked_by_or_blocking(new.user_id) then
      raise exception 'recipient is unavailable' using errcode = '42501';
    end if;
    select c.kind into v_kind from public.resa_conversations c where c.id = new.conversation_id;
    if v_kind = 'group' and not private.resa_contact_allowed(auth.uid(), new.user_id, 'group_invite_policy') then
      raise exception 'recipient does not accept group invitations' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function private.resa_guard_content_interaction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor uuid;
  v_author uuid;
begin
  if tg_table_name = 'resa_comments' then
    v_actor := new.author_id;
  else
    v_actor := new.user_id;
  end if;
  if auth.uid() is null or v_actor <> auth.uid() then
    raise exception 'interaction actor must match authenticated user' using errcode = '42501';
  end if;
  select c.author_id into v_author
  from public.resa_contents c where c.id = new.content_id;
  if v_author is null then
    raise exception 'publication not found' using errcode = '23503';
  end if;
  if private.resa_is_blocked_by_or_blocking(v_author) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_comments_block_guard on public.resa_comments;
create trigger resa_comments_block_guard
before insert or update on public.resa_comments
for each row execute function private.resa_guard_content_interaction();

drop trigger if exists resa_reactions_block_guard on public.resa_reactions;
create trigger resa_reactions_block_guard
before insert or update on public.resa_reactions
for each row execute function private.resa_guard_content_interaction();

drop trigger if exists resa_shares_block_guard on public.resa_shares;
create trigger resa_shares_block_guard
before insert on public.resa_shares
for each row execute function private.resa_guard_content_interaction();

drop policy if exists resa_contents_public_read on public.resa_contents;
drop policy if exists resa_contents_audience_read on public.resa_contents;
create policy resa_contents_audience_read
on public.resa_contents for select to authenticated
using (
  private.resa_can_view_content(author_id, visibility, community_id, organization_id)
  and not private.resa_is_blocked_by_or_blocking(author_id)
);

drop policy if exists resa_comments_read on public.resa_comments;
create policy resa_comments_read
on public.resa_comments for select to authenticated
using (
  exists (
    select 1 from public.resa_contents c
    where c.id = resa_comments.content_id
      and private.resa_can_view_content(c.author_id, c.visibility, c.community_id, c.organization_id)
      and not private.resa_is_blocked_by_or_blocking(c.author_id)
  )
);

commit;
