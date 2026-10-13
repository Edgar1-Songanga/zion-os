-- Church member registry: dedicated permissions, separate from login/account membership management.
-- Safe to re-run: permission and role-permission inserts are idempotent.
begin;

insert into public.permissions (key, name, description)
values
  ('church.members.read', 'Read church member records', 'Read official church member records and status history within an authorized organization.'),
  ('church.members.manage', 'Manage church member records', 'Create and update official church member records within an authorized organization.')
on conflict (key) do nothing;

-- Secretary manages the official church register. Pastor and organization leaders can
-- read it. Organization admins/owners retain full access. These are separate from
-- membership.read/manage, which govern platform account and organization memberships.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('church.members.read', 'church.members.manage')
where r.key in ('secretary', 'organization_admin', 'organization_owner')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'church.members.read'
where r.key in ('pastor', 'organization_leader')
on conflict do nothing;

drop policy if exists church_member_records_read on public.church_member_records;
drop policy if exists church_member_records_insert on public.church_member_records;
drop policy if exists church_member_records_update on public.church_member_records;
drop policy if exists church_member_status_history_read on public.church_member_status_history;

create policy church_member_records_read
on public.church_member_records
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.read'));

create policy church_member_records_insert
on public.church_member_records
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy church_member_records_update
on public.church_member_records
for update to authenticated
using (private.has_org_permission(organization_id, 'church.members.manage'))
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and updated_by = (select auth.uid())
);

create policy church_member_status_history_read
on public.church_member_status_history
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.read'));

commit;
