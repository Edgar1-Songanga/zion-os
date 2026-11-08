begin;

-- A block is symmetric: neither member can discover the other's profile,
-- including when either profile is otherwise public.
create or replace function private.resa_profile_visibility_allowed(
  p_viewer_id uuid,
  p_owner_id uuid,
  p_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select case
    when p_viewer_id is null or p_owner_id is null then false
    when p_viewer_id is distinct from auth.uid() then false
    when p_viewer_id = p_owner_id then true
    when exists (
      select 1
      from public.resa_user_blocks b
      where (b.blocker_id = p_viewer_id and b.blocked_id = p_owner_id)
         or (b.blocker_id = p_owner_id and b.blocked_id = p_viewer_id)
    ) then false
    when p_visibility = 'public' then true
    when p_visibility = 'private' then false
    when p_visibility = 'friends' then exists (
      select 1
      from public.resa_follows a
      join public.resa_follows b
        on b.follower_id = a.followed_id and b.followed_id = a.follower_id
      where a.follower_id = p_viewer_id and a.followed_id = p_owner_id
    )
    when p_visibility = 'friends_of_friends' then (
      exists (
        select 1
        from public.resa_follows a
        join public.resa_follows b
          on b.follower_id = a.followed_id and b.followed_id = a.follower_id
        where a.follower_id = p_viewer_id and a.followed_id = p_owner_id
      )
      or exists (
        select 1
        from public.resa_follows vf
        join public.resa_follows fv
          on fv.follower_id = vf.followed_id and fv.followed_id = vf.follower_id
        join public.resa_follows owner_friend
          on owner_friend.follower_id = vf.followed_id
         and owner_friend.followed_id = p_owner_id
        join public.resa_follows fo
          on fo.follower_id = p_owner_id and fo.followed_id = vf.followed_id
        where vf.follower_id = p_viewer_id
          and vf.followed_id <> p_viewer_id
          and vf.followed_id <> p_owner_id
      )
    )
    when p_visibility = 'community' then exists (
      select 1 from public.resa_follows a
      join public.resa_follows b
        on b.follower_id = a.followed_id and b.followed_id = a.follower_id
      where a.follower_id = p_viewer_id and a.followed_id = p_owner_id
    )
    else false
  end;
$function$;

revoke all on function private.resa_profile_visibility_allowed(uuid,uuid,text) from public, anon;
grant execute on function private.resa_profile_visibility_allowed(uuid,uuid,text) to authenticated;

commit;
