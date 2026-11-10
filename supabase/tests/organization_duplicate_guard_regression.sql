-- Regression coverage for normalized church-name uniqueness within a jurisdiction.
begin;

do $$
declare
  suffix text := replace(gen_random_uuid()::text, '-', '');
  union_id uuid;
  mission_one uuid;
  mission_two uuid;
  church_id uuid;
  second_scope_church uuid;
  rejected boolean;
  church_name text := 'IASD Bairro Central ' || suffix;
begin
  if private.normalize_local_church_name(
       'Igreja Adventista do Sétimo Dia — Porto Seco'
     ) <> private.normalize_local_church_name('IASD Porto Seco') then
    raise exception 'Church-name normalization did not collapse official name and common abbreviation';
  end if;

  insert into public.organizations(name, slug, organization_type)
  values ('Duplicate guard test Union ' || suffix, 'dup-guard-union-' || suffix, 'UNION')
  returning id into union_id;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('Duplicate guard test Mission One ' || suffix, 'dup-guard-mission-one-' || suffix, 'MISSION', union_id)
  returning id into mission_one;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('Duplicate guard test Mission Two ' || suffix, 'dup-guard-mission-two-' || suffix, 'MISSION', union_id)
  returning id into mission_two;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values (church_name, 'dup-guard-church-one-' || suffix, 'LOCAL_CHURCH', mission_one)
  returning id into church_id;

  rejected := false;
  begin
    insert into public.organizations(name, slug, organization_type, parent_id)
    values ('Igreja Adventista do Sétimo Dia — Bairro Central ' || suffix,
            'dup-guard-church-duplicate-' || suffix, 'LOCAL_CHURCH', mission_one);
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Equivalent local church name was accepted in the same Mission';
  end if;

  -- The same church name is valid in a different Mission.
  insert into public.organizations(name, slug, organization_type, parent_id)
  values (church_name, 'dup-guard-church-other-mission-' || suffix, 'LOCAL_CHURCH', mission_two)
  returning id into second_scope_church;

  if second_scope_church is null then
    raise exception 'The same church name should be allowed in a different Mission';
  end if;

  -- A root/unassigned registration has no territorial scope, so it must not
  -- duplicate a church already registered under any Mission.
  rejected := false;
  begin
    insert into public.organizations(name, slug, organization_type)
    values ('IASD Bairro Central ' || suffix,
            'dup-guard-root-bypass-' || suffix, 'LOCAL_CHURCH');
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An unassigned local church bypassed an existing Mission name';
  end if;

  -- Legacy churches without a parent are treated as one unassigned jurisdiction.
  insert into public.organizations(name, slug, organization_type)
  values ('IASD Legacy Guard ' || suffix, 'dup-guard-legacy-one-' || suffix, 'LOCAL_CHURCH');

  rejected := false;
  begin
    insert into public.organizations(name, slug, organization_type)
    values ('Igreja Adventista do Sétimo Dia — Legacy Guard ' || suffix,
            'dup-guard-legacy-two-' || suffix, 'LOCAL_CHURCH');
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Equivalent legacy local church name was accepted without a jurisdiction';
  end if;

  -- Renaming an existing church to a duplicate must also be rejected.
  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('IASD Bairro Norte ' || suffix, 'dup-guard-church-rename-' || suffix, 'LOCAL_CHURCH', mission_one);

  rejected := false;
  begin
    update public.organizations
       set name = 'Igreja Adventista do Sétimo Dia - Bairro Central ' || suffix
     where slug = 'dup-guard-church-rename-' || suffix;
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Renaming a local church to an existing equivalent name was accepted';
  end if;
end;
$$;

rollback;
