\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000011','visibility-viewer@example.test'),
 ('10000000-0000-4000-8000-000000000012','visibility-mutual-friend@example.test'),
 ('10000000-0000-4000-8000-000000000013','visibility-owner@example.test'),
 ('10000000-0000-4000-8000-000000000014','visibility-outsider@example.test')
on conflict (id) do nothing;

insert into public.profiles(id,display_name,privacy) values
 ('10000000-0000-4000-8000-000000000011','Visibility Viewer','{}'),
 ('10000000-0000-4000-8000-000000000012','Mutual Friend','{}'),
 ('10000000-0000-4000-8000-000000000013','Visibility Owner','{"profile_visibility":"friends_of_friends","bio_visibility":"friends_of_friends","country_visibility":"friends_of_friends"}'),
 ('10000000-0000-4000-8000-000000000014','Visibility Outsider','{}')
on conflict (id) do update set display_name=excluded.display_name, privacy=excluded.privacy;

-- Viewer <-> mutual friend <-> owner. The viewer and owner are not direct friends.
insert into public.resa_follows(follower_id,followed_id) values
 ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000012'),
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000011'),
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000013'),
 ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000012')
on conflict do nothing;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',false);
set role authenticated;

do $test$
declare
  v_profile record;
begin
  if not private.resa_profile_visibility_allowed(auth.uid(),'10000000-0000-4000-8000-000000000013'::uuid,'friends_of_friends') then
    raise exception 'friends-of-friends access was not granted through a mutual friend';
  end if;
  if private.resa_profile_visibility_allowed(auth.uid(),'10000000-0000-4000-8000-000000000013'::uuid,'friends') then
    raise exception 'one-way/direct friendship was incorrectly inferred';
  end if;
  if private.resa_profile_visibility_allowed(auth.uid(),'10000000-0000-4000-8000-000000000014'::uuid,'friends_of_friends') then
    raise exception 'unconnected outsider received friends-of-friends access';
  end if;
  if not private.resa_profile_visibility_allowed(auth.uid(),'10000000-0000-4000-8000-000000000014'::uuid,'public') then
    raise exception 'public profile access was denied';
  end if;
  if private.resa_profile_visibility_allowed(auth.uid(),'10000000-0000-4000-8000-000000000014'::uuid,'private') then
    raise exception 'private profile access was granted';
  end if;

  select * into v_profile
  from public.resa_public_profile('10000000-0000-4000-8000-000000000013'::uuid);
  if v_profile.private_locked or v_profile.display_name <> 'Visibility Owner' then
    raise exception 'friends-of-friends profile projection did not expose allowed fields';
  end if;
end;
$test$;

reset role;
