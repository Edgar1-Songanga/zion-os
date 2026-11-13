-- Privacy-scoped cross-church identity candidate discovery.
-- Candidate review is human-led; this migration never links or merges identities.
-- The insert guard serializes exact identity checks to prevent concurrent duplicate creation.

begin;

create table if not exists public.zion_identity_review_audit (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('CANDIDATES_VIEWED', 'IDENTITY_LINKED', 'IDENTITY_LINK_REJECTED', 'IDENTITY_UNLINKED')),
  source_organization_id uuid not null references public.organizations(id) on delete restrict,
  candidate_organization_id uuid references public.organizations(id) on delete restrict,
  source_member_record_id uuid references public.church_member_records(id) on delete restrict,
  candidate_member_record_id uuid references public.church_member_records(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint zion_identity_review_audit_reason_length
    check (reason is null or length(trim(reason)) between 1 and 2000)
);

create index if not exists zion_identity_review_audit_source_idx
  on public.zion_identity_review_audit (source_organization_id, created_at desc);
create index if not exists zion_identity_review_audit_member_idx
  on public.zion_identity_review_audit (source_member_record_id, created_at desc)
  where source_member_record_id is not null;

alter table public.zion_identity_review_audit enable row level security;
revoke all on public.zion_identity_review_audit from anon, authenticated;

create or replace function public.prevent_zion_identity_review_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception 'ZION identity review audit is append-only' using errcode = '55000';
end;
$function$;

drop trigger if exists zion_identity_review_audit_append_only on public.zion_identity_review_audit;
create trigger zion_identity_review_audit_append_only
before update or delete on public.zion_identity_review_audit
for each row execute function public.prevent_zion_identity_review_audit_mutation();

create or replace function public.find_zion_member_identity_candidates(
  p_organization_id uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_gender text default null
)
returns table (
  candidate_member_record_id uuid,
  candidate_organization_id uuid,
  candidate_organization_name text,
  candidate_member_number text,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  membership_status text,
  match_basis text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  actor uuid := auth.uid();
  candidate_count integer := 0;
  normalized_first text := lower(trim(coalesce(p_first_name, '')));
  normalized_last text := lower(trim(coalesce(p_last_name, '')));
begin
  if actor is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_organization_id is null
    or not private.has_org_permission(p_organization_id, 'church.members.manage')
  then
    raise exception 'Not authorized to review identities in this organization' using errcode = '42501';
  end if;

  if length(normalized_first) not between 1 and 120
    or length(normalized_last) not between 1 and 160
    or p_birth_date is null
  then
    raise exception 'First name, last name and birth date are required for candidate discovery' using errcode = '22023';
  end if;

  if p_gender is not null and p_gender not in ('FEMALE', 'MALE', 'UNSPECIFIED') then
    raise exception 'Unsupported gender value' using errcode = '22023';
  end if;

  return query
  select
    m.id,
    m.organization_id,
    o.name,
    m.member_number,
    m.first_name,
    m.last_name,
    m.birth_date,
    m.gender,
    m.membership_status,
    'EXACT_NAME_AND_BIRTH_DATE'::text
  from public.church_member_records m
  join public.organizations o on o.id = m.organization_id
  where private.has_org_permission(m.organization_id, 'church.members.manage')
    and lower(trim(m.first_name)) = normalized_first
    and lower(trim(m.last_name)) = normalized_last
    and m.birth_date = p_birth_date
    and (p_gender is null or m.gender is null or m.gender = p_gender)
  order by
    case when p_gender is not null and m.gender = p_gender then 0 else 1 end,
    m.created_at asc,
    m.id asc
  limit 25;

  get diagnostics candidate_count = row_count;

  insert into public.zion_identity_review_audit (
    event_type, source_organization_id, actor_user_id, metadata
  ) values (
    'CANDIDATES_VIEWED',
    p_organization_id,
    actor,
    jsonb_build_object('candidate_count', candidate_count, 'match_basis', 'EXACT_NAME_AND_BIRTH_DATE')
  );
end;
$function$;

-- Close the race between application-level candidate lookup and concurrent inserts.
-- The advisory transaction lock is keyed only by normalized identity attributes;
-- the query still returns/blocks only records the actor is authorized to manage.
create or replace function public.guard_zion_member_identity_candidate_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  actor uuid := auth.uid();
  normalized_first text := lower(trim(coalesce(new.first_name, '')));
  normalized_last text := lower(trim(coalesce(new.last_name, '')));
begin
  if actor is null or new.birth_date is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    normalized_first || chr(31) || normalized_last || chr(31) || new.birth_date::text,
    0
  ));

  if exists (
    select 1
    from public.church_member_records m
    where m.birth_date = new.birth_date
      and lower(trim(m.first_name)) = normalized_first
      and lower(trim(m.last_name)) = normalized_last
      and (new.gender is null or m.gender is null or m.gender = new.gender)
      and private.has_org_permission(m.organization_id, 'church.members.manage')
  ) then
    raise exception 'Possible existing member records were found. Review identity candidates before creating another record.'
      using errcode = '23505', detail = 'ZION_IDENTITY_CANDIDATE_REVIEW_REQUIRED';
  end if;

  return new;
end;
$function$;

drop trigger if exists church_member_identity_candidate_insert_guard on public.church_member_records;
create trigger church_member_identity_candidate_insert_guard
before insert on public.church_member_records
for each row execute function public.guard_zion_member_identity_candidate_insert();

revoke all on function public.find_zion_member_identity_candidates(uuid, text, text, date, text) from public, anon;
grant execute on function public.find_zion_member_identity_candidates(uuid, text, text, date, text) to authenticated;
revoke all on function public.prevent_zion_identity_review_audit_mutation() from public, anon, authenticated;
revoke all on function public.guard_zion_member_identity_candidate_insert() from public, anon, authenticated;

comment on table public.zion_identity_review_audit is
  'Append-only audit of privacy-scoped cross-church identity candidate reviews and human decisions.';
comment on function public.find_zion_member_identity_candidates(uuid, text, text, date, text) is
  'Returns minimal exact-name-and-birth-date candidates only where the actor has member-management permission in both organizations. Never links records automatically.';
comment on function public.guard_zion_member_identity_candidate_insert() is
  'Serializes exact identity candidate checks before member insertion to prevent concurrent duplicates in authorized jurisdictions.';

commit;
