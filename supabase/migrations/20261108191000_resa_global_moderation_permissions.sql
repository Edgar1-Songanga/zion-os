begin;

alter table public.resa_moderation_reports
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists review_note text;

alter table public.resa_moderation_reports
  drop constraint if exists resa_moderation_reports_review_note_length;
alter table public.resa_moderation_reports
  add constraint resa_moderation_reports_review_note_length
  check (review_note is null or char_length(review_note) <= 2000);

grant select, insert, update on public.resa_moderation_reports to authenticated;

-- Platform-wide reports can have organization_id = NULL. A verified global
-- administrator must be able to review those reports as well as organization
-- scoped reports. Local moderators remain restricted to their organization.
drop policy if exists resa_reports_read on public.resa_moderation_reports;
create policy resa_reports_read
on public.resa_moderation_reports
for select to authenticated
using (
  reporter_id = (select auth.uid())
  or private.is_verified_zion_global_admin()
  or (
    organization_id is not null
    and private.has_org_permission(organization_id, 'resa.moderate')
  )
);

drop policy if exists resa_reports_moderator_update on public.resa_moderation_reports;
create policy resa_reports_moderator_update
on public.resa_moderation_reports
for update to authenticated
using (
  private.is_verified_zion_global_admin()
  or (
    organization_id is not null
    and private.has_org_permission(organization_id, 'resa.moderate')
  )
)
with check (
  private.is_verified_zion_global_admin()
  or (
    organization_id is not null
    and private.has_org_permission(organization_id, 'resa.moderate')
  )
);

commit;
