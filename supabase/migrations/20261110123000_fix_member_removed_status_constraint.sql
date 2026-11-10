-- Replace the actual generated membership status constraint to allow REMOVED.
begin;
alter table public.church_member_records
  drop constraint if exists church_member_records_membership_status_check;
alter table public.church_member_records
  add constraint church_member_records_membership_status_check
  check (membership_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE', 'REMOVED'));
commit;
