-- Global person identity + atomic church transfer.
-- Each person has one global identity; church records represent local memberships.
-- Transfer acceptance creates the destination membership with the SAME identity
-- and marks the origin membership TRANSFERRED in one database transaction.

begin;

create sequence if not exists public.zion_global_member_number_seq;

create table if not exists public.zion_person_identities (
  id uuid primary key default gen_random_uuid(),
  global_member_number text not null unique
    default ('ZION-' || lpad(nextval('public.zion_global_member_number_seq')::text, 10, '0')),
  legal_identifier_hmac text,
  legal_identifier_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zion_person_identity_hmac_format
    check (legal_identifier_hmac is null or legal_identifier_hmac ~ '^[0-9a-f]{64}$')
);

create unique index if not exists zion_person_identity_verified_identifier_uq
  on public.zion_person_identities (legal_identifier_hmac)
  where legal_identifier_hmac is not null;

alter table public.church_member_records
  add column if not exists person_identity_id uuid;

do $$
declare
  r record;
  v_identity uuid;
begin
  for r in
    select id
    from public.church_member_records
    where person_identity_id is null
    order by created_at, id
  loop
    insert into public.zion_person_identities default values
    returning id into v_identity;

    update public.church_member_records
      set person_identity_id = v_identity
      where id = r.id and person_identity_id is null;
  end loop;
end $$;

alter table public.church_member_records
  alter column person_identity_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.church_member_records'::regclass
      and conname = 'church_member_records_person_identity_fk'
  ) then
    alter table public.church_member_records
      add constraint church_member_records_person_identity_fk
      foreign key (person_identity_id)
      references public.zion_person_identities(id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists church_member_records_org_person_uq
  on public.church_member_records (organization_id, person_identity_id);

create index if not exists zion_person_identity_match_lookup_idx
  on public.church_member_records (lower(trim(first_name)), lower(trim(last_name)), birth_date, gender);

create or replace function public.assign_zion_person_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.person_identity_id is null then
    insert into public.zion_person_identities default values
      returning id into new.person_identity_id;
  elsif not exists (
    select 1 from public.zion_person_identities i where i.id = new.person_identity_id
  ) then
    raise exception 'Unknown ZION person identity' using errcode = '23503';
  end if;
  return new;
end;
$function$;

drop trigger if exists church_member_assign_person_identity on public.church_member_records;
create trigger church_member_assign_person_identity
before insert on public.church_member_records
for each row execute function public.assign_zion_person_identity();

alter table public.zion_person_identities enable row level security;
revoke all on public.zion_person_identities from anon, authenticated;
revoke all on sequence public.zion_global_member_number_seq from anon, authenticated;
revoke all on function public.assign_zion_person_identity() from public, anon, authenticated;

-- An accepted transfer is an atomic membership move, not merely a status update.
-- The destination receives a fresh local record number (NULL) but the same global
-- identity and demographic/contact data. Existing destination membership causes
-- a conflict and rolls back the entire acceptance instead of creating duplicates.
create or replace function public.apply_church_member_transfer_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  source_member public.church_member_records%rowtype;
begin
  if new.status <> 'ACCEPTED' or old.status is not distinct from new.status then
    return new;
  end if;

  select *
    into source_member
    from public.church_member_records
   where id = new.member_record_id
     and organization_id = new.origin_organization_id
   for update;

  if not found or source_member.membership_status <> 'ACTIVE' then
    raise exception 'The originating member is no longer active' using errcode = '23514';
  end if;

  insert into public.church_member_records (
    organization_id,
    person_identity_id,
    member_number,
    first_name,
    last_name,
    birth_date,
    gender,
    phone,
    email,
    address,
    baptism_date,
    membership_status,
    joined_on,
    notes,
    created_by,
    updated_by
  ) values (
    new.destination_organization_id,
    source_member.person_identity_id,
    null,
    source_member.first_name,
    source_member.last_name,
    source_member.birth_date,
    source_member.gender,
    source_member.phone,
    source_member.email,
    source_member.address,
    source_member.baptism_date,
    'ACTIVE',
    coalesce(new.request_date, current_date),
    source_member.notes,
    new.decided_by,
    new.decided_by
  );

  update public.church_member_records
     set membership_status = 'TRANSFERRED',
         updated_by = new.decided_by,
         updated_at = now()
   where id = new.member_record_id
     and organization_id = new.origin_organization_id
     and membership_status = 'ACTIVE';

  if not found then
    raise exception 'The originating member could not be transferred' using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- Install the trigger in the migration itself. The regression workflow must not
-- create this trigger manually, otherwise a missing production migration object
-- can be hidden by test setup.
drop trigger if exists church_member_transfer_apply on public.church_member_transfers;
create trigger church_member_transfer_apply
after update of status on public.church_member_transfers
for each row
when (new.status = 'ACCEPTED' and old.status is distinct from new.status)
execute function public.apply_church_member_transfer_acceptance();

revoke all on function public.apply_church_member_transfer_acceptance() from public, anon, authenticated;

comment on table public.zion_person_identities is
  'Global identity for one real person across ZION. Church member records are scoped memberships.';
comment on column public.zion_person_identities.legal_identifier_hmac is
  'HMAC-SHA256 of a verified official identifier using a server-held secret; never store raw identifiers or unkeyed hashes.';
comment on column public.church_member_records.person_identity_id is
  'Platform-wide identity shared by memberships in multiple churches.';

commit;
