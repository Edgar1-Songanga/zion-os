begin;

do $$
declare
  gc uuid;
  division uuid;
  union_id uuid;
  mission uuid;
  church uuid;
  standalone_church uuid;
  test_user uuid := gen_random_uuid();
  hierarchy_rows integer;
  department_root uuid;
  department_child uuid;
  rejected boolean := false;
begin
  insert into public.organizations(name,slug,organization_type)
  values ('Test General Conference','test-gc','GENERAL_CONFERENCE')
  returning id into gc;

  rejected := false;
  begin
    insert into public.organizations(name,slug,organization_type)
    values ('Duplicate General Conference','duplicate-gc','GENERAL_CONFERENCE');
  exception when unique_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'A second General Conference root was not rejected'; end if;

  insert into public.organizations(name,slug,organization_type,parent_id)
  values ('Test Division','test-division','DIVISION',gc)
  returning id into division;

  insert into public.organizations(name,slug,organization_type,parent_id)
  values ('Test Union','test-union','UNION',division)
  returning id into union_id;

  insert into public.organizations(name,slug,organization_type,parent_id)
  values ('Test Mission','test-mission','MISSION',union_id)
  returning id into mission;

  insert into public.organizations(name,slug,organization_type,parent_id)
  values ('Test Local Church','test-local-church','LOCAL_CHURCH',mission)
  returning id into church;

  insert into public.organizations(name,slug,organization_type)
  values ('Legacy Standalone Church','test-standalone-church','LOCAL_CHURCH')
  returning id into standalone_church;

  if not exists (
    select 1 from public.organizations
    where id = church and parent_id = mission and organization_type = 'LOCAL_CHURCH'
  ) then
    raise exception 'Valid institutional hierarchy was not persisted';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = standalone_church and parent_id is null
  ) then
    raise exception 'Legacy standalone local church compatibility failed';
  end if;

  if private.has_hr_permission_in_hierarchy(church, 'hr.manage') then
    raise exception 'HR permissions must not be available at local church level';
  end if;
  if not private.has_hr_permission_in_hierarchy(mission, 'hr.manage') then
    raise exception 'HR permissions should remain available at mission level when inherited';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='hr_employees'
      and policyname='hr_employees_insert'
      and with_check like '%has_hr_permission_in_hierarchy%'
  ) then
    raise exception 'HR employee insert policy was not restricted to institutional levels';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_runs'
      and policyname='payroll_runs_insert'
      and with_check like '%has_hr_permission_in_hierarchy%'
  ) then
    raise exception 'Payroll run insert policy was not restricted to institutional levels';
  end if;

  begin
    insert into public.organizations(name,slug,organization_type,parent_id)
    values ('Invalid Mission','invalid-mission','MISSION',division);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'Mission under Division was not rejected'; end if;

  rejected := false;
  begin
    insert into public.organizations(name,slug,organization_type,parent_id)
    values ('Invalid Division','invalid-division','DIVISION',union_id);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'Division under Union was not rejected'; end if;

  rejected := false;
  begin
    delete from public.organizations where id = mission;
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'Deleting an organization with subordinate churches was not rejected'; end if;

  rejected := false;
  begin
    perform public.zion_create_institutional_organization(
      'Unauthorized Union','unauthorized-union','UNION',division
    );
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Institutional creation without verified global admin was not rejected'; end if;

  rejected := false;
  begin
    perform * from public.zion_list_institutional_organizations();
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Institutional directory access without verified global admin was not rejected'; end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('request.jwt.claim.sub'),
      'app_metadata', jsonb_build_object('zion_global_role','global_admin','zion_verified',true)
    )::text,
    true
  );

  perform public.zion_create_institutional_organization(
    'Authorized Union','authorized-union','UNION',division
  );

  insert into public.organization_memberships(organization_id,user_id,status)
  values (church,test_user,'ACTIVE');

  perform set_config('request.jwt.claim.sub', test_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user)::text, true);
  select count(*) into hierarchy_rows
  from public.zion_get_organization_hierarchy(church);
  if hierarchy_rows <> 5 then
    raise exception 'Organization member did not receive the complete ancestry chain';
  end if;

  rejected := false;
  begin
    perform * from public.zion_get_organization_hierarchy(standalone_church);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Member was able to inspect an unrelated organization hierarchy'; end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config('request.jwt.claims', '{}'::text, true);
  rejected := false;
  begin
    perform * from public.zion_get_organization_hierarchy(church);
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Unauthenticated user was able to inspect organization hierarchy'; end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('request.jwt.claim.sub'),
      'app_metadata', jsonb_build_object('zion_global_role','global_admin','zion_verified',true)
    )::text,
    true
  );

  if not exists (select 1 from public.organizations where slug='authorized-union' and parent_id=division) then
    raise exception 'Verified global administrator could not create a valid institutional organization';
  end if;

  if (select count(*) from public.zion_list_institutional_organizations()) <> 7 then
    raise exception 'Verified global administrator did not receive the institutional directory';
  end if;

  -- Department trees must remain inside one organization and be acyclic.
  insert into public.organization_units(organization_id, name, unit_type)
  values (church, 'Department root', 'DEPARTMENT')
  returning id into department_root;

  insert into public.organization_units(organization_id, parent_id, name, unit_type)
  values (church, department_root, 'Department child', 'SUBDEPARTMENT')
  returning id into department_child;

  rejected := false;
  begin
    insert into public.organization_units(organization_id, parent_id, name, unit_type)
    values (standalone_church, department_root, 'Cross-organization child', 'SUBDEPARTMENT');
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'A department was allowed to reference a parent in another organization';
  end if;

  rejected := false;
  begin
    update public.organization_units
       set parent_id = department_child
     where id = department_root;
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'A cyclic department hierarchy was allowed';
  end if;

  if not exists (
    select 1 from public.organization_units
     where id = department_child and parent_id = department_root
  ) then
    raise exception 'Valid department hierarchy was not preserved';
  end if;
end;
$$;


-- Exercise the RLS policies as an authenticated client, not as the postgres
-- migration owner. A verified global administrator gets only the allowlisted
-- organization/membership/audit permissions.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'app_metadata', jsonb_build_object(
      'zion_global_role', 'global_admin',
      'zion_verified', true
    )
  )::text,
  true
);

do $global_admin_rls$
declare
  church_id uuid;
  standalone_id uuid;
  visible_units integer;
  rejected boolean := false;
begin
  select id into church_id from public.organizations where slug='test-local-church';
  select id into standalone_id from public.organizations where slug='test-standalone-church';

  if not private.is_verified_zion_global_admin() then
    raise exception 'Verified global administrator claim was not recognized';
  end if;
  if not private.has_org_permission(church_id, 'organization.manage')
     or not private.has_org_permission(church_id, 'membership.manage') then
    raise exception 'Verified global administrator lacks allowlisted organization permissions';
  end if;
  if private.has_org_permission(church_id, 'finance.manage')
     or private.has_org_permission(church_id, 'finance.post')
     or private.has_org_permission(church_id, 'hr.manage')
     or private.has_org_permission(church_id, 'payroll.manage')
     or private.has_org_permission(church_id, 'giving.manage') then
    raise exception 'Verified global administrator received an out-of-scope module permission';
  end if;

  select count(*) into visible_units
  from public.organization_units
  where organization_id = church_id;
  if visible_units < 2 then
    raise exception 'Verified global administrator could not inspect organization units';
  end if;

  insert into public.organization_units(organization_id, name, unit_type)
  values (standalone_id, 'Global admin created unit', 'DEPARTMENT');

  if not exists (
    select 1 from public.organization_units
    where organization_id=standalone_id and name='Global admin created unit'
  ) then
    raise exception 'Verified global administrator could not create an organization unit';
  end if;

  -- A malformed server claim must fail closed without raising a cast error.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'app_metadata', jsonb_build_object(
        'zion_global_role', 'global_admin',
        'zion_verified', 'not-a-boolean'
      )
    )::text,
    true
  );
  if private.is_verified_zion_global_admin() then
    raise exception 'Malformed verified claim was accepted';
  end if;
  rejected := false;
  begin
    insert into public.organization_units(organization_id, name, unit_type)
    values (church_id, 'Must be rejected', 'DEPARTMENT');
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Malformed verified claim was allowed to create an organization unit';
  end if;

  -- user_metadata is user-editable and must never confer global-admin rights.
  perform set_config(
    'request.jwt.claim.sub',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    true
  );
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'user_metadata', jsonb_build_object(
        'zion_global_role', 'global_admin',
        'zion_verified', true
      )
    )::text,
    true
  );
  if private.is_verified_zion_global_admin() then
    raise exception 'User-editable metadata was incorrectly trusted as global-admin authorization';
  end if;

  select count(*) into visible_units
  from public.organization_units
  where organization_id = church_id;
  if visible_units <> 0 then
    raise exception 'Ordinary user could inspect another organization units';
  end if;

  rejected := false;
  begin
    insert into public.organization_units(organization_id, name, unit_type)
    values (church_id, 'Forged admin unit', 'DEPARTMENT');
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Ordinary user with forged user_metadata created an organization unit';
  end if;
end;
$global_admin_rls$;

reset role;

rollback;
