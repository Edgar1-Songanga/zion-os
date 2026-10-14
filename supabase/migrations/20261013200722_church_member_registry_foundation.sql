-- Church member registry foundation.
-- Restored to version control from the verified ZION OS production schema.
-- Keep this migration before church_member_registry_permissions so fresh databases
-- create the referenced tables before the RLS policies are installed.

begin;

create table if not exists public.church_member_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_number text,
  first_name text not null,
  last_name text not null,
  birth_date date,
  gender text,
  phone text,
  email text,
  address text,
  baptism_date date,
  membership_status text not null default 'ACTIVE',
  joined_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_member_records_member_number_length
    check (member_number is null or length(trim(member_number)) between 1 and 80),
  constraint church_member_records_first_name_length
    check (length(trim(first_name)) between 1 and 120),
  constraint church_member_records_last_name_length
    check (length(trim(last_name)) between 1 and 160),
  constraint church_member_records_gender_check
    check (gender is null or gender in ('FEMALE', 'MALE', 'UNSPECIFIED')),
  constraint church_member_records_status_check
    check (membership_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE'))
);

create unique index if not exists church_member_number_org_unique
  on public.church_member_records (organization_id, member_number);
create index if not exists church_member_records_org_created_idx
  on public.church_member_records (organization_id, created_at desc);
create index if not exists church_member_records_org_status_idx
  on public.church_member_records (organization_id, membership_status, last_name, first_name);

create table if not exists public.church_member_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_record_id uuid not null references public.church_member_records(id) on delete cascade,
  previous_status text,
  new_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint church_member_status_history_new_status_check
    check (new_status in ('ACTIVE', 'TRANSFERRED', 'DECEASED', 'DISMISSED', 'INACTIVE'))
);

create index if not exists church_member_status_history_member_idx
  on public.church_member_status_history (member_record_id, changed_at desc);

alter table public.church_member_records enable row level security;
alter table public.church_member_status_history enable row level security;

revoke all on public.church_member_records from anon;
revoke all on public.church_member_status_history from anon;
grant select, insert, update on public.church_member_records to authenticated;
grant select on public.church_member_status_history to authenticated;

commit;
