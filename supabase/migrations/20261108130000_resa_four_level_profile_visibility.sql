begin;

-- RESA profile visibility is a four-level relationship graph.
-- A friendship is represented by reciprocal follows; no separate friend state
-- is inferred from a one-way follow.
update public.profiles
set privacy = coalesce(privacy, '{}'::jsonb) || jsonb_build_object(
  'profile_visibility', case
    when privacy->>'profile_visibility' = 'community' then 'friends'
    when privacy->>'profile_visibility' in ('public','friends','friends_of_friends','private') then privacy->>'profile_visibility'
    else 'friends' end,
  'bio_visibility', case
    when privacy->>'bio_visibility' = 'community' then 'friends'
    when privacy->>'bio_visibility' in ('public','friends','friends_of_friends','private') then privacy->>'bio_visibility'
    else 'friends' end,
  'country_visibility', case
    when privacy->>'country_visibility' = 'community' then 'friends'
    when privacy->>'country_visibility' in ('public','friends','friends_of_friends','private') then privacy->>'country_visibility'
    else 'friends' end,
  'timezone_visibility', case
    when privacy->>'timezone_visibility' = 'community' then 'friends'
    when privacy->>'timezone_visibility' in ('public','friends','friends_of_friends','private') then privacy->>'timezone_visibility'
    else 'private' end
);

alter table public.profiles alter column privacy set default '{
  "profile_visibility":"friends",
  "bio_visibility":"friends",
  "country_visibility":"friends",
  "timezone_visibility":"private",
  "message_policy":"everyone",
  "call_policy":"everyone",
  "group_invite_policy":"everyone",
  "follow_policy":"auto"
}'::jsonb;

create or replace function private.resa_profile_visibility_allowed(p_viewer_id uuid, p_owner_id uuid, p_visibility text)
returns boolean
language sql stable security definer
set search_path = pg_catalog, pg_temp
as $function$
  select case
    when p_viewer_id is null or p_owner_id is null then false
    when p_viewer_id = p_owner_id then true
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
        join public.resa_follows fo
          on fo.follower_id = p_owner_id and fo.followed_id = owner_friend.followed_id
        where vf.follower_id = p_viewer_id
          and owner_friend.followed_id <> p_viewer_id
          and owner_friend.followed_id <> p_owner_id
      )
    )
    -- Legacy value is treated as friends during transition only.
    when p_visibility = 'community' then exists (
      select 1 from public.resa_follows a
      join public.resa_follows b on b.follower_id = a.followed_id and b.followed_id = a.follower_id
      where a.follower_id = p_viewer_id and a.followed_id = p_owner_id
    )
    else false
  end;
$function$;
revoke all on function private.resa_profile_visibility_allowed(uuid,uuid,text) from public, anon;
grant execute on function private.resa_profile_visibility_allowed(uuid,uuid,text) to authenticated;

create or replace function private.resa_public_profile_internal(p_user_id uuid)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, bio text, country_code text, is_owner boolean, is_following boolean, message_allowed boolean, call_allowed boolean, group_invite_allowed boolean, follow_allowed boolean, private_locked boolean)
language sql stable security definer
set search_path = pg_catalog, pg_temp
as $function$
  with viewer as (select auth.uid() as user_id), target as (
    select p.*,
      (p.id = viewer.user_id) as is_owner,
      exists(select 1 from public.resa_follows f where f.follower_id = viewer.user_id and f.followed_id = p.id) as is_following,
      private.resa_profile_visibility_allowed(viewer.user_id, p.id, coalesce(p.privacy->>'profile_visibility','friends')) as profile_allowed
    from public.profiles p cross join viewer
    where p.id = p_user_id and viewer.user_id is not null
  )
  select target.id,
    case when not target.profile_allowed then null else target.display_name end,
    case when not target.profile_allowed then null else target.first_name end,
    case when not target.profile_allowed then null else target.last_name end,
    case when not target.profile_allowed then null else target.avatar_url end,
    case when target.is_owner or (target.profile_allowed and private.resa_profile_visibility_allowed((select user_id from viewer), target.id, coalesce(target.privacy->>'bio_visibility','friends'))) then target.bio end,
    case when target.is_owner or (target.profile_allowed and private.resa_profile_visibility_allowed((select user_id from viewer), target.id, coalesce(target.privacy->>'country_visibility','friends'))) then target.country_code end,
    target.is_owner, target.is_following,
    not target.is_owner and target.profile_allowed and private.resa_contact_allowed((select user_id from viewer), target.id, 'message_policy'),
    not target.is_owner and target.profile_allowed and private.resa_contact_allowed((select user_id from viewer), target.id, 'call_policy'),
    not target.is_owner and target.profile_allowed and private.resa_contact_allowed((select user_id from viewer), target.id, 'group_invite_policy'),
    not target.is_owner and target.privacy->>'profile_visibility' is distinct from 'private' and not target.is_following and private.resa_contact_allowed((select user_id from viewer), target.id, 'follow_policy'),
    not target.profile_allowed
  from target;
$function$;

-- Search and ID-based profile lookups must apply the same relationship rules.
create or replace function public.resa_profiles_for_ids(p_user_ids uuid[])
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql security definer
set search_path = pg_catalog, pg_temp
as $function$
  select p.id, p.display_name,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.first_name end,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.last_name end,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.avatar_url end,
    case when coalesce(p.privacy->>'profile_visibility','friends') = 'public' then u.email end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and cardinality(coalesce(p_user_ids, array[]::uuid[])) between 1 and 200
    and private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends'))
    and p.id = any(coalesce(p_user_ids, array[]::uuid[]))
  order by coalesce(p.display_name, p.first_name, u.email), p.id
  limit 200;
$function$;

create or replace function public.resa_search_profiles(p_query text, p_limit integer default 20)
returns table(id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql security definer
set search_path = pg_catalog, pg_temp
as $function$
  select p.id, p.display_name,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.first_name end,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.last_name end,
    case when private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends')) then p.avatar_url end,
    case when coalesce(p.privacy->>'profile_visibility','friends') = 'public' then u.email end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and p_query is not null
    and length(btrim(p_query)) between 2 and 120
    and private.resa_profile_visibility_allowed(auth.uid(),p.id,coalesce(p.privacy->>'profile_visibility','friends'))
    and (
      pg_catalog.strpos(pg_catalog.lower(coalesce(p.display_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.first_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(p.last_name,'')), pg_catalog.lower(btrim(p_query))) > 0
      or (coalesce(p.privacy->>'profile_visibility','friends') = 'public'
        and pg_catalog.strpos(pg_catalog.lower(coalesce(u.email,'')), pg_catalog.lower(btrim(p_query))) > 0)
      or p.id::text = btrim(p_query)
    )
  order by coalesce(p.display_name, p.first_name, p.id::text), p.id
  limit greatest(1, least(coalesce(p_limit,20),100));
$function$;

revoke all on function public.resa_profiles_for_ids(uuid[]) from public, anon;
revoke all on function public.resa_search_profiles(text, integer) from public, anon;
grant execute on function public.resa_profiles_for_ids(uuid[]) to authenticated;
grant execute on function public.resa_search_profiles(text, integer) to authenticated;

commit;
