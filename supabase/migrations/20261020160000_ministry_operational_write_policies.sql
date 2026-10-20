-- Restore the write paths required by the ministry operations API.
-- Read policies remain separate; writes are scoped to organization managers or
-- verified leaders assigned to the specific ministry.
begin;

drop policy if exists ministries_admin_insert on public.ministries;
create policy ministries_admin_insert
on public.ministries for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'organization.manage')
  and created_by = (select auth.uid())
);

drop policy if exists ministries_admin_update on public.ministries;
create policy ministries_admin_update
on public.ministries for update to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'))
with check (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists ministries_admin_delete on public.ministries;
create policy ministries_admin_delete
on public.ministries for delete to authenticated
using (private.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists ministry_leaders_admin_write on public.ministry_leaders;
create policy ministry_leaders_admin_write
on public.ministry_leaders for all to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and private.has_org_permission(m.organization_id, 'organization.manage')
  )
)
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and private.has_org_permission(m.organization_id, 'organization.manage')
  )
);

drop policy if exists ministry_programs_authorized_insert on public.ministry_programs;
create policy ministry_programs_authorized_insert
on public.ministry_programs for insert to authenticated
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'organization.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_programs_authorized_update on public.ministry_programs;
create policy ministry_programs_authorized_update
on public.ministry_programs for update to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'organization.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
)
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'organization.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_programs_authorized_delete on public.ministry_programs;
create policy ministry_programs_authorized_delete
on public.ministry_programs for delete to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'organization.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_members_authorized_insert on public.ministry_members;
create policy ministry_members_authorized_insert
on public.ministry_members for insert to authenticated
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'membership.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
  and exists (
    select 1 from public.ministries m
    join public.organization_memberships om on om.organization_id = m.organization_id
    where m.id = ministry_id
      and om.user_id = ministry_members.user_id
      and om.status = 'ACTIVE'
  )
);

drop policy if exists ministry_members_authorized_update on public.ministry_members;
create policy ministry_members_authorized_update
on public.ministry_members for update to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'membership.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
)
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'membership.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_members_authorized_delete on public.ministry_members;
create policy ministry_members_authorized_delete
on public.ministry_members for delete to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'membership.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_reports_authorized_insert on public.ministry_reports;
create policy ministry_reports_authorized_insert
on public.ministry_reports for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and (
        private.has_org_permission(m.organization_id, 'organization.manage')
        or exists (
          select 1 from public.ministry_leaders l
          where l.ministry_id = m.id
            and l.user_id = (select auth.uid())
            and l.verified = true
        )
      )
  )
);

drop policy if exists ministry_reports_admin_review on public.ministry_reports;
create policy ministry_reports_admin_review
on public.ministry_reports for update to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and private.has_org_permission(m.organization_id, 'organization.manage')
  )
)
with check (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and private.has_org_permission(m.organization_id, 'organization.manage')
  )
);

drop policy if exists ministry_reports_admin_delete on public.ministry_reports;
create policy ministry_reports_admin_delete
on public.ministry_reports for delete to authenticated
using (
  exists (
    select 1 from public.ministries m
    where m.id = ministry_id
      and private.has_org_permission(m.organization_id, 'organization.manage')
  )
);

commit;
