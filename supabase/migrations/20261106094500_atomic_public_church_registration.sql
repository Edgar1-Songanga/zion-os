-- Public onboarding is limited to personal accounts and local churches.
-- A church, its founder membership and its audit event must be committed atomically.
create or replace function public.zion_create_local_church(p_name text, p_slug text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(trim(p_name), '');
  v_slug text := lower(trim(p_slug));
  v_role_id uuid;
  v_organization public.organizations%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if v_name is null or length(v_name) > 160 then raise exception 'Church name is required and must not exceed 160 characters' using errcode = '22023'; end if;
  if v_slug is null or length(v_slug) < 3 or length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'Invalid church address' using errcode = '22023';
  end if;
  select id into v_role_id from public.roles where key = 'organization_owner' limit 1;
  if v_role_id is null then raise exception 'Organization owner role is not configured' using errcode = '55000'; end if;
  insert into public.organizations (name, slug, organization_type, parent_id, created_by)
  values (v_name, v_slug, 'LOCAL_CHURCH', null, v_user_id) returning * into v_organization;
  insert into public.organization_memberships (organization_id, user_id, role_id, status)
  values (v_organization.id, v_user_id, v_role_id, 'ACTIVE');
  insert into public.audit_logs (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (v_organization.id, v_user_id, 'organization.created', 'organization', v_organization.id,
    jsonb_build_object('organization_type', 'LOCAL_CHURCH', 'onboarding', 'public'));
  return jsonb_build_object('id',v_organization.id,'name',v_organization.name,'slug',v_organization.slug,
    'organization_type',v_organization.organization_type,'parent_id',v_organization.parent_id,
    'created_by',v_organization.created_by,'is_active',v_organization.is_active);
end;
$$;
revoke all on function public.zion_create_local_church(text,text) from public;
revoke all on function public.zion_create_local_church(text,text) from anon;
grant execute on function public.zion_create_local_church(text,text) to authenticated;
drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()) and organization_type = 'LOCAL_CHURCH' and parent_id is null);
