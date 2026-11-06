-- Grant the verified ZION global administrator only the platform-wide
-- organization and membership capabilities needed to administer institutional
-- structure. This deliberately does not grant finance, HR, payroll or giving access.
--
-- Authorization uses server-managed app_metadata from the signed Supabase JWT.
-- user_metadata is intentionally ignored because users can edit it themselves.

create or replace function private.is_verified_zion_global_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, auth
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'zion_global_role', '') = 'global_admin'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'zion_verified', '') = 'true';
$$;

comment on function private.is_verified_zion_global_admin() is
  'True only for an authenticated user whose signed JWT contains server-managed verified ZION global-admin claims.';

create or replace function private.has_org_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.organization_memberships m
        join public.role_permissions rp on rp.role_id = m.role_id
        join public.permissions p on p.id = rp.permission_id
        where m.organization_id = target_org
          and m.user_id = auth.uid()
          and m.status = 'ACTIVE'
          and p.key = permission_key
      )
      or (
        permission_key = any (array[
          'organization.manage',
          'membership.manage',
          'audit.read'
        ]::text[])
        and private.is_verified_zion_global_admin()
      )
    );
$$;

comment on function private.has_org_permission(uuid, text) is
  'Checks active organization role permissions, with a narrowly allowlisted verified global-admin override for organization, membership and audit administration.';

drop policy if exists units_select_member on public.organization_units;
create policy units_select_member
on public.organization_units
for select
to authenticated
using (
  private.is_org_member(organization_id)
  or private.is_verified_zion_global_admin()
);

-- A verified platform administrator may write an audit record for an
-- organization they administer even without holding a local membership.
-- The actor identity remains bound to auth.uid(); ordinary users retain the
-- original active-membership restriction.
drop policy if exists audit_insert_actor on public.audit_logs;
create policy audit_insert_actor
on public.audit_logs
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (
    organization_id is null
    or private.is_org_member(organization_id)
    or private.is_verified_zion_global_admin()
  )
);

-- Keep function execution scoped to authenticated sessions. RLS policies invoke
-- these helpers under the caller's JWT context.
revoke all on function private.is_verified_zion_global_admin() from public, anon;
grant execute on function private.is_verified_zion_global_admin() to authenticated;
revoke all on function private.has_org_permission(uuid, text) from public, anon;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
