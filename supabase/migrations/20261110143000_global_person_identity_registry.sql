-- Global person identity foundation.
-- A person has one platform-wide identity; each church record is a scoped membership.
-- Fuzzy demographic matches are candidates only, never automatic merges.
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

-- Backfill each existing member row to one global identity, preserving all existing church records.
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

alter table public.church_member_records
  add constraint church_member_records_person_identity_fk
  foreign key (person_identity_id)
  references public.zion_person_identities(id)
  on delete restrict;

create unique index if not exists church_member_records_org_person_uq
  on public.church_member_records (organization_id, person_identity_id);

create index if not exists zion_person_identity_match_lookup_idx
  on public.church_member_records (lower(trim(first_name)), lower(trim(last_name)), birth_date, gender);

-- The central identity registry is not directly exposed to client roles.
alter table public.zion_person_identities enable row level security;
revoke all on public.zion_person_identities from anon, authenticated;
revoke all on sequence public.zion_global_member_number_seq from anon, authenticated;

comment on table public.zion_person_identities is
  'Global identity for one real person across ZION. Church member records are scoped memberships. Do not merge on name alone.';
comment on column public.zion_person_identities.legal_identifier_hmac is
  'HMAC-SHA256 of a verified official identifier using a server-held secret; never store raw identifiers or unkeyed hashes.';
comment on column public.church_member_records.person_identity_id is
  'Platform-wide person identity shared by memberships in multiple churches.';

commit;
