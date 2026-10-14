-- Incoming/outgoing member transfer workflow with explicit decisions and immutable history.
begin;

create table if not exists public.church_member_transfers (
  id uuid primary key default gen_random_uuid(),
  member_record_id uuid not null,
  origin_organization_id uuid not null references public.organizations(id) on delete restrict,
  destination_organization_id uuid not null references public.organizations(id) on delete restrict,
  status text not null default 'DRAFT',
  request_date date not null default current_date,
  reason text,
  document_reference text,
  requested_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_member_transfers_different_orgs check (origin_organization_id <> destination_organization_id),
  constraint church_member_transfers_status_check check (status in ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  constraint church_member_transfers_member_origin_fk
    foreign key (member_record_id, origin_organization_id)
    references public.church_member_records (id, organization_id) on delete restrict,
  constraint church_member_transfers_reason_length check (reason is null or length(reason) <= 2000),
  constraint church_member_transfers_document_reference_length check (document_reference is null or length(document_reference) <= 500),
  constraint church_member_transfers_decision_note_length check (decision_note is null or length(decision_note) <= 2000)
);

create unique index if not exists church_member_transfer_one_open_per_member
  on public.church_member_transfers (member_record_id)
  where status in ('DRAFT', 'SUBMITTED');
create index if not exists church_member_transfers_origin_status_idx
  on public.church_member_transfers (origin_organization_id, status, created_at desc);
create index if not exists church_member_transfers_destination_status_idx
  on public.church_member_transfers (destination_organization_id, status, created_at desc);

create table if not exists public.church_member_transfer_history (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.church_member_transfers(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  changed_at timestamptz not null default now(),
  constraint church_member_transfer_history_status_check check (new_status in ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'))
);
create index if not exists church_member_transfer_history_transfer_idx
  on public.church_member_transfer_history (transfer_id, changed_at desc);

alter table public.church_member_transfers enable row level security;
alter table public.church_member_transfer_history enable row level security;
revoke all on public.church_member_transfers from anon;
revoke all on public.church_member_transfer_history from anon;
grant select, insert, update on public.church_member_transfers to authenticated;
grant select on public.church_member_transfer_history to authenticated;

drop policy if exists church_member_transfers_read on public.church_member_transfers;
create policy church_member_transfers_read
on public.church_member_transfers for select to authenticated
using (
  private.has_org_permission(origin_organization_id, 'church.members.read')
  or private.has_org_permission(destination_organization_id, 'church.members.read')
);

drop policy if exists church_member_transfers_insert on public.church_member_transfers;
create policy church_member_transfers_insert
on public.church_member_transfers for insert to authenticated
with check (
  private.has_org_permission(origin_organization_id, 'church.members.manage')
  and requested_by = (select auth.uid())
  and status = 'DRAFT'
);

drop policy if exists church_member_transfers_update on public.church_member_transfers;
create policy church_member_transfers_update
on public.church_member_transfers for update to authenticated
using (
  private.has_org_permission(origin_organization_id, 'church.members.manage')
  or private.has_org_permission(destination_organization_id, 'church.members.manage')
)
with check (
  private.has_org_permission(origin_organization_id, 'church.members.manage')
  or private.has_org_permission(destination_organization_id, 'church.members.manage')
);

drop policy if exists church_member_transfer_history_read on public.church_member_transfer_history;
create policy church_member_transfer_history_read
on public.church_member_transfer_history for select to authenticated
using (
  exists (
    select 1
    from public.church_member_transfers t
    where t.id = transfer_id
      and (
        private.has_org_permission(t.origin_organization_id, 'church.members.read')
        or private.has_org_permission(t.destination_organization_id, 'church.members.read')
      )
  )
);

create or replace function public.guard_church_member_transfer_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if actor is null or new.requested_by <> actor
      or not private.has_org_permission(new.origin_organization_id, 'church.members.manage')
      or new.status <> 'DRAFT'
    then
      raise exception 'Not authorized to create this transfer' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.origin_organization_id is distinct from old.origin_organization_id
    or new.destination_organization_id is distinct from old.destination_organization_id
    or new.member_record_id is distinct from old.member_record_id
    or new.requested_by is distinct from old.requested_by
  then
    raise exception 'Transfer parties and member cannot be changed after creation' using errcode = '42501';
  end if;

  if new.status is not distinct from old.status then
    if old.status <> 'DRAFT'
      or not private.has_org_permission(old.origin_organization_id, 'church.members.manage')
    then
      raise exception 'Only the originating organization can edit a draft transfer' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if old.status = 'DRAFT' and new.status in ('SUBMITTED', 'CANCELLED') then
    if not private.has_org_permission(old.origin_organization_id, 'church.members.manage') then
      raise exception 'Only the originating organization can submit or cancel this transfer' using errcode = '42501';
    end if;
    if new.status = 'SUBMITTED' then new.submitted_at := now(); end if;
  elsif old.status = 'SUBMITTED' and new.status in ('ACCEPTED', 'REJECTED') then
    if not private.has_org_permission(old.destination_organization_id, 'church.members.manage') then
      raise exception 'Only the destination organization can decide this transfer' using errcode = '42501';
    end if;
    new.decided_by := actor;
    new.decided_at := now();
  elsif old.status = 'SUBMITTED' and new.status = 'CANCELLED' then
    if not private.has_org_permission(old.origin_organization_id, 'church.members.manage') then
      raise exception 'Only the originating organization can cancel a submitted transfer' using errcode = '42501';
    end if;
  else
    raise exception 'Invalid transfer state transition: % -> %', old.status, new.status using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists church_member_transfer_guard on public.church_member_transfers;
create trigger church_member_transfer_guard
before insert or update on public.church_member_transfers
for each row execute function public.guard_church_member_transfer_change();

create or replace function public.record_church_member_transfer_history()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.church_member_transfer_history
    (transfer_id, previous_status, new_status, actor_user_id, note)
  values
    (new.id, case when tg_op = 'INSERT' then null else old.status end,
     new.status, auth.uid(),
     case when new.status in ('ACCEPTED', 'REJECTED') then new.decision_note else new.reason end);
  return new;
end;
$function$;

drop trigger if exists church_member_transfer_history_write on public.church_member_transfers;
create trigger church_member_transfer_history_write
after insert or update of status on public.church_member_transfers
for each row execute function public.record_church_member_transfer_history();

revoke all on function public.guard_church_member_transfer_change() from public, anon, authenticated;
revoke all on function public.record_church_member_transfer_history() from public, anon, authenticated;

commit;
