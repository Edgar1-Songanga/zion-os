begin;

do $$
declare
  actor_authorized uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  actor_limited uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  source_org uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  candidate_org uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  restricted_org uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  active_candidate uuid;
  deceased_candidate uuid;
  same_church_candidate uuid;
  active_identity uuid;
  deceased_identity uuid;
  visible_count integer;
  audit_count integer;
begin
  insert into auth.users(id) values (actor_authorized), (actor_limited);
  insert into public.organizations(id, name) values
    (source_org, 'Source Church'),
    (candidate_org, 'Authorized Candidate Church'),
    (restricted_org, 'Restricted Candidate Church');

  insert into public.zion_test_org_permissions(actor_id, organization_id, permission_key) values
    (actor_authorized, source_org, 'church.members.manage'),
    (actor_authorized, candidate_org, 'church.members.manage'),
    (actor_limited, source_org, 'church.members.manage');

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    candidate_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', 'ACTIVE'
  ) returning id, person_identity_id into active_candidate, active_identity;

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    candidate_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', 'DECEASED'
  ) returning id, person_identity_id into deceased_candidate, deceased_identity;

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    restricted_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', 'ACTIVE'
  );

  insert into public.church_member_records(
    organization_id, first_name, last_name, birth_date, gender, membership_status
  ) values (
    source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', 'ACTIVE'
  ) returning id into same_church_candidate;

  if active_identity = deceased_identity then
    raise exception 'Fixture unexpectedly reused a global identity before human review';
  end if;

  perform set_config('request.jwt.claim.sub', actor_authorized::text, true);
  select count(*) into visible_count
    from public.find_zion_member_identity_candidates(
      source_org, ' Ana ', ' Silva ', date '1990-05-12', 'FEMALE'
    );

  if visible_count <> 3 then
    raise exception 'Expected same-church and cross-church candidates within authorized jurisdictions; got %', visible_count;
  end if;

  if not exists (
    select 1 from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    ) c where c.candidate_member_record_id = same_church_candidate
  ) then
    raise exception 'Same-church duplicate candidate was not returned for review';
  end if;

  if not exists (
    select 1 from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    ) c where c.candidate_member_record_id = deceased_candidate
      and c.membership_status = 'DECEASED'
  ) then
    raise exception 'Deceased member history was not preserved in candidate results';
  end if;

  if exists (
    select 1 from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    ) c where c.candidate_organization_id = restricted_org
  ) then
    raise exception 'Candidate search exposed a church outside the actor jurisdiction';
  end if;

  perform set_config('request.jwt.claim.sub', actor_limited::text, true);
  select count(*) into visible_count
    from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    ) c
   where c.candidate_organization_id = candidate_org;

  if visible_count <> 0 then
    raise exception 'Candidate search exposed records without permission in the candidate church';
  end if;

  begin
    perform * from public.find_zion_member_identity_candidates(
      restricted_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    );
    raise exception 'Search in an unauthorized source organization was not rejected';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', actor_authorized::text, true);
  select count(*) into visible_count
    from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Other', date '1990-05-12', 'FEMALE'
    );
  if visible_count <> 0 then
    raise exception 'A non-exact name match was incorrectly returned as a candidate';
  end if;

  -- The trigger must reject an exact duplicate even if two requests race after lookup.
  begin
    insert into public.church_member_records(
      organization_id, first_name, last_name, birth_date, gender, membership_status
    ) values (
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', 'ACTIVE'
    );
    raise exception 'Concurrent duplicate insert was not blocked';
  exception when unique_violation then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform * from public.find_zion_member_identity_candidates(
      source_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE'
    );
    raise exception 'Unauthenticated candidate search was not rejected';
  exception when insufficient_privilege then
    null;
  end;

  select count(*) into audit_count
    from public.zion_identity_review_audit
   where event_type = 'CANDIDATES_VIEWED'
     and source_organization_id = source_org;

  if audit_count <> 6 then
    raise exception 'Expected privacy-safe candidate-view audit events; got %', audit_count;
  end if;

  if exists (
    select 1 from public.zion_identity_review_audit
     where metadata ? 'birth_date'
        or metadata ? 'first_name'
        or metadata ? 'last_name'
  ) then
    raise exception 'Candidate search audit must not persist personal search values';
  end if;

  begin
    update public.zion_identity_review_audit
       set reason = 'tamper attempt'
     where source_organization_id = source_org;
    raise exception 'Append-only audit accepted an update';
  exception when sqlstate '55000' then
    null;
  end;
end
$$;

rollback;
