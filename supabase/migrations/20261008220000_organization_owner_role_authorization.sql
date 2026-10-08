-- Establish a verified organization owner above organization administrators.
-- Owners are the only role allowed to grant elevated organizational roles.
insert into public.permissions(key,name,description)
values (
  'membership.role.assign',
  'Membership — Assign roles',
  'Assign elevated organization roles to members'
)
on conflict(key) do update
set name=excluded.name, description=excluded.description;

insert into public.roles(key,name,description,is_system)
values (
  'organization_owner',
  'Organization Owner',
  'Verified authority for an organization; can authorize administrators and other elevated roles',
  true
)
on conflict(key) do update
set name=excluded.name, description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select owner.id,p.id
from public.roles owner
cross join public.roles admin
join public.role_permissions admin_rp on admin_rp.role_id=admin.id
join public.permissions p on p.id=admin_rp.permission_id
where owner.key='organization_owner'
  and admin.key='organization_admin'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r
join public.permissions p on p.key='membership.role.assign'
where r.key='organization_owner'
on conflict do nothing;

create or replace function private.can_assign_org_role(target_org uuid, target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.organization_memberships actor_membership
    join public.role_permissions actor_rp on actor_rp.role_id=actor_membership.role_id
    join public.permissions actor_permission on actor_permission.id=actor_rp.permission_id
    join public.roles target_role on target_role.id=target_role_id
    where actor_membership.organization_id=target_org
      and actor_membership.user_id=auth.uid()
      and actor_membership.status='ACTIVE'
      and actor_permission.key='membership.role.assign'
      and target_role.key <> 'organization_owner'
  );
$function$;

create or replace function private.can_update_org_membership(
  target_org uuid,
  target_membership uuid,
  target_role_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    private.has_org_permission(target_org,'membership.manage')
    and (
      private.can_assign_org_role(target_org,target_role_id)
      or exists (
        select 1
        from public.organization_memberships current_membership
        where current_membership.id=target_membership
          and current_membership.organization_id=target_org
          and current_membership.role_id=target_role_id
      )
    );
$function$;

drop policy if exists memberships_insert on public.organization_memberships;
create policy memberships_insert on public.organization_memberships
for insert to authenticated
with check (
  (
    user_id=(select auth.uid())
    and status='PENDING'
    and role_id=(select id from public.roles where key='member' limit 1)
  )
  or
  (
    exists (
      select 1
      from public.organizations o
      where o.id=organization_id
        and o.created_by=(select auth.uid())
    )
    and user_id=(select auth.uid())
    and status='ACTIVE'
    and role_id=(select id from public.roles where key='organization_owner' limit 1)
  )
  or
  (
    private.has_org_permission(organization_id,'membership.manage')
    and (
      role_id=(select id from public.roles where key='member' limit 1)
      or private.can_assign_org_role(organization_id,role_id)
    )
  )
);

drop policy if exists memberships_update_admin on public.organization_memberships;
create policy memberships_update_admin on public.organization_memberships
for update to authenticated
using (private.has_org_permission(organization_id,'membership.manage'))
with check (
  private.can_update_org_membership(organization_id,id,role_id)
);

drop policy if exists memberships_delete_admin on public.organization_memberships;
create policy memberships_delete_admin on public.organization_memberships
for delete to authenticated
using (
  private.has_org_permission(organization_id,'membership.manage')
  and not exists (
    select 1
    from public.roles r
    where r.id=organization_memberships.role_id
      and r.key='organization_owner'
  )
);

-- Existing organizations created before this migration retain their creator as owner
-- when that creator was the organization administrator.
update public.organization_memberships m
set role_id=(select id from public.roles where key='organization_owner' limit 1)
from public.organizations o
join public.roles current_role on current_role.id=m.role_id
where m.organization_id=o.id
  and m.user_id=o.created_by
  and current_role.key='organization_admin';
