begin;

do $$
declare
  gc uuid;
  division uuid;
  union_id uuid;
  mission uuid;
  church uuid;
  standalone_church uuid;
  rejected boolean := false;
begin
  insert into public.organizations(name,slug,organization_type)
  values ('Test General Conference','test-gc','GENERAL_CONFERENCE')
  returning id into gc;

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
    perform public.zion_create_institutional_organization(
      'Unauthorized Union','unauthorized-union','UNION',division
    );
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Institutional creation without verified global admin was not rejected'; end if;

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

  if not exists (select 1 from public.organizations where slug='authorized-union' and parent_id=division) then
    raise exception 'Verified global administrator could not create a valid institutional organization';
  end if;
end;
$$;

rollback;
