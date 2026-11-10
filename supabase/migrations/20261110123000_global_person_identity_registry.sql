-- One global person identity shared by all church memberships.
-- Demographic matches are surfaced for human confirmation; never auto-merge people by name.
begin;

create sequence if not exists public.zion_global_member_number_seq;

create table if not exists public.zion_person_identities (
  id uuid primary key default gen_random_uuid(),
  global_member_number text not null unique
    default ('ZION-' || lpad(nextval('public.zion_global_member_number_seq')::text, 10, '0')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.church_member_records
  add column if not exists person_identity_id uuid;

-- Backfill one canonical identity for every legacy member record.
do $backfill$
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
end;
$backfill$;

alter table public.church_member_records
  alter column person_identity_id set not null;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'church_member_records_person_identity_fk'
      and conrelid = 'public.church_member_records'::regclass
  ) then
    alter table public.church_member_records
      add constraint church_member_records_person_identity_fk
      foreign key (person_identity_id)
      references public.zion_person_identities(id)
      on delete restrict;
  end if;
end;
$constraint$;

create or replace function private.normalize_member_identity_name(p_value text)
returns text
language sql
immutable
set search_path to 'pg_catalog', 'private'
as $normalize$
  select regexp_replace(
    translate(
      lower(trim(coalesce(p_value, ''))),
      'áàâãäéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaeeeeiiiiooooouuuucnyy'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  );
$normalize$;

create unique index if not exists church_member_records_org_person_identity_uq
  on public.church_member_records (organization_id, person_identity_id);

create index if not exists church_member_records_identity_match_idx
  on public.church_member_records (
    private.normalize_member_identity_name(first_name),
    private.normalize_member_identity_name(last_name),
    birth_date,
    gender,
    organization_id
  );

create or replace function private.ensure_zion_person_identity()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $identity$
begin
  if tg_op = 'INSERT' then
    if new.person_identity_id is null then
      insert into public.zion_person_identities default values
      returning id into new.person_identity_id;
    elsif not exists (
      select 1 from public.zion_person_identities i
      where i.id = new.person_identity_id
    ) then
      raise exception 'The supplied global person identity does not exist.'
        using errcode = '23503';
    end if;
  elsif new.person_identity_id is distinct from old.person_identity_id then
    raise exception 'A member identity cannot be changed through an ordinary member update.'
      using errcode = '55000';
  end if;

  return new;
end;
$identity$;

drop trigger if exists church_member_records_person_identity_guard on public.church_member_records;
create trigger church_member_records_person_identity_guard
before insert or update of person_identity_id on public.church_member_records
for each row execute function private.ensure_zion_person_identity();

alter table public.zion_person_identities enable row level security;
revoke all on public.zion_person_identities from public, anon, authenticated;
revoke all on sequence public.zion_global_member_number_seq from public, anon, authenticated;

-- Mission secretaries inherit member read/manage permission across their Mission's churches.
drop policy if exists church_member_records_insert on public.church_member_records;
create policy church_member_records_insert
on public.church_member_records
for insert to authenticated
with check (
  (
    private.is_verified_zion_global_admin()
    or private.has_org_permission_in_hierarchy(organization_id, 'church.members.manage')
  )
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

drop policy if exists church_member_records_read on public.church_member_records;
create policy church_member_records_read
on public.church_member_records
for select to authenticated
using (
  private.is_verified_zion_global_admin()
  or private.has_org_permission_in_hierarchy(organization_id, 'church.members.read')
  or private.has_org_permission_in_hierarchy(organization_id, 'church.members.manage')
);

drop policy if exists church_member_records_update on public.church_member_records;
create policy church_member_records_update
on public.church_member_records
for update to authenticated
using (
  private.is_verified_zion_global_admin()
  or private.has_org_permission_in_hierarchy(organization_id, 'church.members.manage')
)
with check (
  (
    private.is_verified_zion_global_admin()
    or private.has_org_permission_in_hierarchy(organization_id, 'church.members.manage')
  )
  and updated_by = (select auth.uid())
);

drop policy if exists organizations_select_hierarchy_members on public.organizations;
create policy organizations_select_hierarchy_members
on public.organizations
for select to authenticated
using (
  private.is_verified_zion_global_admin()
  or private.has_org_permission_in_hierarchy(id, 'church.members.read')
  or private.has_org_permission_in_hierarchy(id, 'church.members.manage')
);

create or replace function public.zion_find_person_identity_candidates(
  p_organization_id uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_gender text
)
returns table (
  member_record_id uuid,
  person_identity_id uuid,
  organization_id uuid,
  organization_name text,
  member_number text,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  membership_status text
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $candidates$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_first_name is null or length(trim(p_first_name)) = 0
    or p_last_name is null or length(trim(p_last_name)) = 0
    or p_birth_date is null then
    return;
  end if;

  if not private.is_verified_zion_global_admin()
    and not private.has_org_permission_in_hierarchy(p_organization_id, 'church.members.manage') then
    raise exception 'Member management permission is required in the selected organization.'
      using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.person_identity_id,
    m.organization_id,
    o.name,
    m.member_number,
    m.first_name,
    m.last_name,
    m.birth_date,
    m.gender,
    m.membership_status
  from public.church_member_records m
  join public.organizations o on o.id = m.organization_id
  where o.is_active
    and m.membership_status not in ('DECEASED', 'REMOVED')
    and private.normalize_member_identity_name(m.first_name) = private.normalize_member_identity_name(p_first_name)
    and private.normalize_member_identity_name(m.last_name) = private.normalize_member_identity_name(p_last_name)
    and m.birth_date = p_birth_date
    and m.gender is not distinct from p_gender
    and (
      private.is_verified_zion_global_admin()
      or private.has_org_permission_in_hierarchy(m.organization_id, 'church.members.read')
      or private.has_org_permission_in_hierarchy(m.organization_id, 'church.members.manage')
    )
  order by o.name asc, m.last_name asc, m.first_name asc
  limit 25;
end;
$candidates$;

revoke all on function public.zion_find_person_identity_candidates(uuid, text, text, date, text) from public, anon;
grant execute on function public.zion_find_person_identity_candidates(uuid, text, text, date, text) to authenticated;

comment on table public.zion_person_identities is
  'Canonical global identity for one real person. A person can have multiple church membership records linked to the same identity.';
comment on column public.church_member_records.person_identity_id is
  'Global person identity. Transfer workflows retain this identifier; never create a second identity for an existing person.';

commit;
