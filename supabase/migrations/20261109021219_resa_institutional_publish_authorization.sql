-- Server-authoritative authorization for RESA posts attributed to an institution.
-- Organization administrators may publish on behalf of the organization.
-- Ministry leaders may publish only for the ministry they lead and only when
-- that ministry belongs to the supplied organization.
create or replace function public.resa_can_publish_institutional_content(
  p_organization_id uuid,
  p_ministry_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null
    and p_organization_id is not null
    and (
      p_ministry_id is null
      or exists (
        select 1
          from public.ministries m
         where m.id = p_ministry_id
           and m.organization_id = p_organization_id
      )
    )
    and (
      private.has_org_permission(p_organization_id, 'organization.manage')
      or (
        p_ministry_id is not null
        and exists (
          select 1
            from public.ministry_leaders ml
            join public.ministries m on m.id = ml.ministry_id
           where ml.user_id = auth.uid()
             and ml.ministry_id = p_ministry_id
             and m.organization_id = p_organization_id
        )
      )
    );
$$;

comment on function public.resa_can_publish_institutional_content(uuid, uuid) is
  'Checks the authenticated user can attribute a RESA publication to an organization or a ministry within that organization.';

revoke all on function public.resa_can_publish_institutional_content(uuid, uuid) from public, anon;
grant execute on function public.resa_can_publish_institutional_content(uuid, uuid) to authenticated;
