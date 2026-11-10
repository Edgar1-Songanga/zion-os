-- Regression coverage for canonical global person identity and church membership reuse.
begin;

do $identity_test$
declare
  suffix text := replace(gen_random_uuid()::text, '-', '');
  mission_id uuid;
  origin_church_id uuid;
  destination_church_id uuid;
  origin_member_id uuid;
  destination_member_id uuid;
  new_member_id uuid;
  identity_id uuid;
  second_identity_id uuid;
  candidate record;
  blocked boolean := false;
begin
  insert into public.organizations(name, slug, organization_type)
  values ('Identity test Mission ' || suffix, 'identity-mission-' || suffix, 'MISSION')
  returning id into mission_id;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('Identity origin ' || suffix, 'identity-origin-' || suffix, 'LOCAL_CHURCH', mission_id)
  returning id into origin_church_id;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('Identity destination ' || suffix, 'identity-destination-' || suffix, 'LOCAL_CHURCH', mission_id)
  returning id into destination_church_id;

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    origin_church_id, 'Ána', 'Silva', '1988-03-12', 'FEMALE', 'ACTIVE'
  ) returning id, person_identity_id into origin_member_id, identity_id;

  if identity_id is null then
    raise exception 'New member insert did not receive a global person identity';
  end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config('request.jwt.claims', '{"app_metadata":{"zion_global_role":"member","zion_verified":false}}', true);

  select * into candidate
  from public.zion_find_person_identity_candidates(
    destination_church_id, 'Ana', 'Silva', '1988-03-12', 'FEMALE'
  )
  limit 1;

  if candidate.member_record_id is distinct from origin_member_id
    or candidate.person_identity_id is distinct from identity_id then
    raise exception 'Global identity candidate search did not return the existing member';
  end if;

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status, person_identity_id
  ) values (
    destination_church_id, 'Ana', 'Silva', '1988-03-12', 'FEMALE', 'ACTIVE', identity_id
  ) returning id into destination_member_id;

  if (select person_identity_id from public.church_member_records where id = destination_member_id) <> identity_id then
    raise exception 'Cross-church membership did not reuse the canonical person identity';
  end if;

  blocked := false;
  begin
    insert into public.church_member_records(
      organization_id, first_name, last_name, birth_date, gender, membership_status, person_identity_id
    ) values (
      destination_church_id, 'Ana', 'Silva', '1988-03-12', 'FEMALE', 'ACTIVE', identity_id
    );
  exception when unique_violation then
    blocked := true;
  end;
  if not blocked then
    raise exception 'The same global person identity was allowed twice in one church';
  end if;

  insert into public.zion_person_identities default values returning id into second_identity_id;
  blocked := false;
  begin
    update public.church_member_records
    set person_identity_id = second_identity_id
    where id = destination_member_id;
  exception when sqlstate '55000' then
    blocked := true;
  end;
  if not blocked then
    raise exception 'An ordinary member update changed the canonical global identity';
  end if;

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    destination_church_id, 'Beatriz', 'Costa', '1991-09-04', 'FEMALE', 'ACTIVE'
  ) returning id into new_member_id;

  if (select person_identity_id from public.church_member_records where id = new_member_id) is null then
    raise exception 'A new member record did not receive its own global identity';
  end if;

  if (select person_identity_id from public.church_member_records where id = new_member_id) = identity_id then
    raise exception 'A different person was incorrectly assigned to an existing identity';
  end if;
end;
$identity_test$;

rollback;
