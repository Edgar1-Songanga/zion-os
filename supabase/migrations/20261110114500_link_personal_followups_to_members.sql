-- Link consent-based personal ministry follow-ups to the canonical church member record.
-- Existing follow-ups remain valid and unlinked; new links must belong to the same organization.
begin;

create unique index if not exists church_member_records_id_organization_uq
  on public.church_member_records (id, organization_id);

alter table public.personal_ministry_follow_ups
  add column if not exists member_record_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_ministry_follow_ups_member_org_fk'
      and conrelid = 'public.personal_ministry_follow_ups'::regclass
  ) then
    alter table public.personal_ministry_follow_ups
      add constraint personal_ministry_follow_ups_member_org_fk
      foreign key (member_record_id, organization_id)
      references public.church_member_records (id, organization_id)
      on delete restrict;
  end if;
end $$;

create index if not exists personal_ministry_follow_ups_member_idx
  on public.personal_ministry_follow_ups (organization_id, member_record_id)
  where member_record_id is not null;

comment on column public.personal_ministry_follow_ups.member_record_id is
  'Optional link to the member register. The follow-up remains consent-based and is not a substitute for pastoral notes or sensitive case records.';

commit;
