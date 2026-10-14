-- Formal baptism register with evidence references, explicit validation and immutable status history.
begin;

create table if not exists public.church_member_baptism_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_record_id uuid not null,
  baptism_date date not null,
  location text not null,
  congregation_name text not null,
  minister_name text not null,
  document_reference text,
  notes text,
  status text not null default 'PENDING',
  created_by uuid not null references auth.users(id) on delete restrict,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  validation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_member_baptism_member_org_fk
    foreign key (member_record_id, organization_id)
    references public.church_member_records (id, organization_id) on delete restrict,
  constraint church_member_baptism_status_check
    check (status in ('PENDING', 'VALIDATED', 'REJECTED')),
  constraint church_member_baptism_location_length check (length(trim(location)) between 1 and 250),
  constraint church_member_baptism_congregation_length check (length(trim(congregation_name)) between 1 and 250),
  constraint church_member_baptism_minister_length check (length(trim(minister_name)) between 1 and 200),
  constraint church_member_baptism_document_reference_length check (document_reference is null or length(document_reference) <= 500),
  constraint church_member_baptism_notes_length check (notes is null or length(notes) <= 4000),
  constraint church_member_baptism_validation_note_length check (validation_note is null or length(validation_note) <= 2000),
  constraint church_member_baptism_validation_metadata_check
    check ((status = 'PENDING' and validated_by is null and validated_at is null)
      or (status in ('VALIDATED', 'REJECTED') and validated_by is not null and validated_at is not null))
);

create index if not exists church_member_baptism_org_date_idx
  on public.church_member_baptism_records (organization_id, baptism_date desc);
create index if not exists church_member_baptism_member_idx
  on public.church_member_baptism_records (organization_id, member_record_id, created_at desc);
create unique index if not exists church_member_baptism_one_validated_per_member
  on public.church_member_baptism_records (member_record_id)
  where status = 'VALIDATED';

create table if not exists public.church_member_baptism_history (
  id uuid primary key default gen_random_uuid(),
  baptism_record_id uuid not null references public.church_member_baptism_records(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  previous_status text,
  new_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  changed_at timestamptz not null default now(),
  constraint church_member_baptism_history_status_check
    check (new_status in ('PENDING', 'VALIDATED', 'REJECTED'))
);
create index if not exists church_member_baptism_history_record_idx
  on public.church_member_baptism_history (baptism_record_id, changed_at desc);

alter table public.church_member_baptism_records enable row level security;
alter table public.church_member_baptism_history enable row level security;
revoke all on public.church_member_baptism_records from anon;
revoke all on public.church_member_baptism_history from anon;
grant select, insert, update on public.church_member_baptism_records to authenticated;
grant select on public.church_member_baptism_history to authenticated;

drop policy if exists church_member_baptism_read on public.church_member_baptism_records;
create policy church_member_baptism_read on public.church_member_baptism_records
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.read'));

drop policy if exists church_member_baptism_insert on public.church_member_baptism_records;
create policy church_member_baptism_insert on public.church_member_baptism_records
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and created_by = (select auth.uid())
  and status = 'PENDING'
  and validated_by is null
  and validated_at is null
);

drop policy if exists church_member_baptism_update on public.church_member_baptism_records;
create policy church_member_baptism_update on public.church_member_baptism_records
for update to authenticated
using (private.has_org_permission(organization_id, 'church.members.manage'))
with check (private.has_org_permission(organization_id, 'church.members.manage'));

drop policy if exists church_member_baptism_history_read on public.church_member_baptism_history;
create policy church_member_baptism_history_read on public.church_member_baptism_history
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.read'));

create or replace function public.guard_church_member_baptism_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if actor is null or new.created_by <> actor
      or not private.has_org_permission(new.organization_id, 'church.members.manage')
      or new.status <> 'PENDING'
      or new.validated_by is not null or new.validated_at is not null
    then
      raise exception 'Not authorized to create this baptism record' using errcode = '42501';
    end if;
    new.location := trim(new.location);
    new.congregation_name := trim(new.congregation_name);
    new.minister_name := trim(new.minister_name);
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.member_record_id is distinct from old.member_record_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Baptism record identity fields are immutable' using errcode = '42501';
  end if;

  if old.status <> 'PENDING' then
    raise exception 'A decided baptism record cannot be edited' using errcode = '42501';
  end if;

  if not private.has_org_permission(old.organization_id, 'church.members.manage') then
    raise exception 'Not authorized to manage this baptism record' using errcode = '42501';
  end if;

  if new.status = 'PENDING' then
    if new.validated_by is distinct from old.validated_by
      or new.validated_at is distinct from old.validated_at
      or new.validation_note is distinct from old.validation_note
    then
      raise exception 'Validation metadata requires a decision transition' using errcode = '42501';
    end if;
  elsif new.status in ('VALIDATED', 'REJECTED') then
    new.validated_by := actor;
    new.validated_at := now();
  else
    raise exception 'Unsupported baptism status' using errcode = '23514';
  end if;

  new.location := trim(new.location);
  new.congregation_name := trim(new.congregation_name);
  new.minister_name := trim(new.minister_name);
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists church_member_baptism_guard on public.church_member_baptism_records;
create trigger church_member_baptism_guard
before insert or update on public.church_member_baptism_records
for each row execute function public.guard_church_member_baptism_change();

create or replace function public.record_church_member_baptism_history()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.church_member_baptism_history
    (baptism_record_id, organization_id, previous_status, new_status, actor_user_id, note)
  values
    (new.id, new.organization_id,
     case when tg_op = 'INSERT' then null else old.status end,
     new.status, auth.uid(),
     case when new.status in ('VALIDATED', 'REJECTED') then new.validation_note else new.notes end);

  if new.status = 'VALIDATED' then
    update public.church_member_records
      set baptism_date = new.baptism_date, updated_at = now()
      where id = new.member_record_id and organization_id = new.organization_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists church_member_baptism_history_write on public.church_member_baptism_records;
create trigger church_member_baptism_history_write
after insert or update of status on public.church_member_baptism_records
for each row execute function public.record_church_member_baptism_history();

revoke all on function public.guard_church_member_baptism_change() from public, anon, authenticated;
revoke all on function public.record_church_member_baptism_history() from public, anon, authenticated;

commit;
