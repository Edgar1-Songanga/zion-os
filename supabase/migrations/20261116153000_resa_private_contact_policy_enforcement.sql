begin;

-- Keep contact permissions aligned with the public profile projection.
-- A private profile must not be reachable through direct conversation RPCs
-- or an already-existing conversation unless the viewer already follows the profile.
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
  v_profile_visibility text;
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

  select p.privacy->>p_policy_field,
         coalesce(p.privacy->>'profile_visibility', 'community')
    into v_policy, v_profile_visibility
  from public.profiles p
  where p.id = p_target_id;

  if not found then
    return false;
  end if;

  v_policy := coalesce(v_policy, case when p_policy_field = 'follow_policy' then 'auto' else 'everyone' end);

  -- Follow eligibility is independent of message/call visibility; do not
  -- prevent a private-profile follow/request flow at this layer.
  if p_policy_field = 'follow_policy' then
    return v_policy <> 'none';
  end if;

  if v_profile_visibility = 'private'
     and not exists (
       select 1 from public.resa_follows f
       where f.follower_id = p_actor_id
         and f.followed_id = p_target_id
     ) then
    return false;
  end if;

  if v_policy = 'everyone' then return true; end if;
  if v_policy = 'none' then return false; end if;
  if v_policy = 'followers' then
    return exists (
      select 1 from public.resa_follows f
      where f.follower_id = p_actor_id and f.followed_id = p_target_id
    );
  end if;
  if v_policy = 'following' then
    return exists (
      select 1 from public.resa_follows f
      where f.follower_id = p_target_id and f.followed_id = p_actor_id
    );
  end if;

  return false;
end;
$function$;

revoke all on function private.resa_contact_allowed(uuid,uuid,text) from public, anon;
grant execute on function private.resa_contact_allowed(uuid,uuid,text) to authenticated;

commit;
