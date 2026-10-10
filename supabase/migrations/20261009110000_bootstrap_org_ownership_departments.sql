-- Reconcile the existing Zion organizations created before ownership
-- memberships were provisioned. Existing memberships/roles are never replaced.
-- Finance and HR are starter departments, not employee or payroll records.

do $$
begin
  if not exists (select 1 from public.roles where key = 'organization_owner') then
    raise exception 'organization_owner role is required before organization bootstrap';
  end if;
end;
$$;

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
