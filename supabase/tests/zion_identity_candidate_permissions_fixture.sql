create table public.zion_test_org_permissions (
  actor_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  permission_key text not null,
  primary key (actor_id, organization_id, permission_key)
);

create or replace function private.has_org_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select exists (
    select 1
    from public.zion_test_org_permissions p
    where p.actor_id = auth.uid()
      and p.organization_id = target_org
      and p.permission_key = has_org_permission.permission_key
  );
$function$;
