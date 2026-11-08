begin;

-- Public visibility is opt-in. Existing classes and activities remain private
-- until an authorized ministry leader explicitly publishes them.
alter table public.sabbath_school_classes
  add column if not exists is_public boolean not null default false;

alter table public.youth_club_activities
  add column if not exists is_public boolean not null default false;

create index if not exists sabbath_school_classes_public_idx
  on public.sabbath_school_classes (organization_id, name)
  where is_public = true and is_active = true;

create index if not exists youth_club_activities_public_idx
  on public.youth_club_activities (starts_at asc, organization_id)
  where is_public = true and status <> 'CANCELLED';

-- Keep member rosters and attendance private. Only the class directory fields
-- are selected by the public-feed API; RLS permits authenticated community reads.
drop policy if exists sabbath_school_classes_read on public.sabbath_school_classes;
create policy sabbath_school_classes_read on public.sabbath_school_classes
for select to authenticated
using (
  (is_public = true and is_active = true)
  or private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.ministry_leaders ml
    where ml.ministry_id = sabbath_school_classes.ministry_id
      and ml.user_id = (select auth.uid())
  )
  or teacher_user_id = (select auth.uid())
);

-- Youth activity visibility is independent from participant and attendance data.
drop policy if exists youth_club_activities_read on public.youth_club_activities;
create policy youth_club_activities_read on public.youth_club_activities
for select to authenticated
using (
  is_public = true
  or private.has_org_permission(organization_id, 'membership.read')
  or private.has_org_permission(organization_id, 'organization.manage')
  or exists (
    select 1 from public.youth_club_leaders l
    where l.club_id = youth_club_activities.club_id
      and l.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.youth_club_members m
    where m.club_id = youth_club_activities.club_id
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
  )
);

comment on column public.sabbath_school_classes.is_public is
  'When true, authenticated RESA members can see class name and meeting details; roster and attendance remain private.';
comment on column public.youth_club_activities.is_public is
  'When true, authenticated RESA members can see the activity announcement; participant records remain private.';

commit;
