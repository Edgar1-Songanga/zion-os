-- Regression coverage for scoped, audited church archiving.
begin;

do $$
declare
  suffix text := replace(gen_random_uuid()::text, '-', '');
  actor uuid := gen_random_uuid();
  secretary_role uuid;
  archive_permission uuid;
  mission_id uuid;
  church_id uuid;
  blocked boolean := false;
  archived public.organizations%rowtype;
begin
  insert into auth.users(id) values (actor);

  insert into public.roles(key, name)
  values ('secretary', 'Secretary')
  on conflict (key) do update set name = excluded.name
  returning id into secretary_role;

  insert into public.permissions(key, name, description)
  values ('organization.archive', 'Archive local churches', 'Archive local churches in a Mission')
  on conflict (key) do update set name = excluded.name, description = excluded.description
  returning id into archive_permission;

  insert into public.role_permissions(role_id, permission_id)
  values (secretary_role, archive_permission)
  on conflict do nothing;

  insert into public.organizations(name, slug, organization_type)
  values ('Archive test Mission ' || suffix, 'archive-mission-' || suffix, 'MISSION')
  returning id into mission_id;

  insert into public.organizations(name, slug, organization_type, parent_id)
  values ('Archive test Church ' || suffix, 'archive-church-' || suffix, 'LOCAL_CHURCH', mission_id)
  returning id into church_id;

  insert into public.organization_memberships(organization_id, user_id, status, role_id)
  values (mission_id, actor, 'ACTIVE', secretary_role);

  -- Direct deactivation must not bypass the audited RPC.
  blocked := false;
  begin
    update public.organizations set is_active = false where id = church_id;
  exception when sqlstate '55000' then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Direct organization deactivation bypassed the archive workflow';
  end if;

  -- Hard deletion must always be rejected.
  blocked := false;
  begin
    delete from public.organizations where id = church_id;
  exception when sqlstate '55000' then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Hard deletion of a church was not blocked';
  end if;

  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', actor::text,
    'app_metadata', jsonb_build_object('zion_global_role', 'member', 'zion_verified', false)
  )::text, true);

  archived := private.zion_archive_local_church(church_id, 'Approved church closure test');
  if archived.is_active or archived.archived_at is null or archived.archived_by <> actor then
    raise exception 'Mission secretary archive did not persist the expected archive metadata';
  end if;

  if not exists (
    select 1 from public.audit_logs
    where resource_id = church_id and action = 'ORGANIZATION_ARCHIVED'
      and actor_user_id = actor
  ) then
    raise exception 'Church archive did not write an audit event';
  end if;

  if exists (
    select 1 from public.organization_memberships
    where organization_id = mission_id and user_id = actor and status <> 'ACTIVE'
  ) then
    raise exception 'Archiving a church unexpectedly changed the Mission secretary membership';
  end if;
end;
$$;

rollback;
