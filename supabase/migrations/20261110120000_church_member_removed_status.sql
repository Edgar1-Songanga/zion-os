-- Preserve member records while making deceased and removed registers queryable.
begin;

alter table public.church_member_records
  drop constraint if exists church_member_records_status_check;
alter table public.church_member_records
  add constraint church_member_records_status_check
  check (membership_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE', 'REMOVED'));

alter table public.church_member_status_history
  drop constraint if exists church_member_status_history_new_status_check;
alter table public.church_member_status_history
  add constraint church_member_status_history_new_status_check
  check (new_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE', 'REMOVED'));

commit;
