-- Seed the two explicitly designated initial account roles in server-managed Auth metadata.
-- app_metadata is managed by the server and is not editable by the account owner.
do $$
begin
  if not exists (select 1 from auth.users where lower(email) = 'veudaed@gmail.com') then
    raise exception 'Expected initial global administrator account veudaed@gmail.com was not found';
  end if;
  if not exists (select 1 from auth.users where lower(email) = 'ohuminho@gmail.com') then
    raise exception 'Expected initial member test account ohuminho@gmail.com was not found';
  end if;
  if not exists (select 1 from public.roles where key = 'organization_owner') then
    raise exception 'organization_owner role is required before organization bootstrap';
  end if;
end;
$$;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('zion_global_role', 'global_admin')
where lower(email) = 'veudaed@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('zion_global_role', 'member')
where lower(email) = 'ohuminho@gmail.com';

-- Restore owner memberships for organizations whose creator is still an active Auth user.
-- This is idempotent and follows the existing organization bootstrap contract.
insert into public.organization_memberships (organization_id, user_id, role_id, status)
select o.id, o.created_by, owner_role.id, 'ACTIVE'
from public.organizations o
join auth.users u on u.id = o.created_by
join public.roles owner_role on owner_role.key = 'organization_owner'
where o.created_by is not null
  and not exists (
    select 1
    from public.organization_memberships existing
    where existing.organization_id = o.id
      and existing.user_id = o.created_by
  )
on conflict (organization_id, user_id) do nothing;

insert into public.organization_units (organization_id, parent_id, name, unit_type, description)
select o.id, null, defaults.name, 'DEPARTMENT', defaults.description
from public.organizations o
cross join (values
  ('Finanças', 'Área institucional para orçamento, contabilidade e controlo financeiro.'),
  ('Recursos Humanos', 'Área institucional para colaboradores, contratos e processos de RH.')
) as defaults(name, description)
where not exists (
  select 1
  from public.organization_units existing
  where existing.organization_id = o.id
    and lower(trim(existing.name)) = lower(defaults.name)
);
