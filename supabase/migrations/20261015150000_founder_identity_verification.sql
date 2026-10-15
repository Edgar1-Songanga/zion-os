-- Persistent founder identity and verification requests.
-- Founder recognition is tied to the authenticated account email, never signup order or display name.

create table if not exists public.account_identity_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_founder boolean not null default false,
  verification_status text not null default 'not_verified'
    check (verification_status in ('not_verified', 'pending', 'verified', 'rejected', 'suspended')),
  verification_type text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_has_verified_identity check (
    not is_founder or verification_status in ('pending', 'verified')
  )
);

create table if not exists public.account_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_type text not null
    check (requested_type in ('personal', 'professional', 'pastor', 'ministry', 'organization')),
  evidence_refs jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text
);

create index if not exists idx_account_verification_requests_user
  on public.account_verification_requests(user_id, submitted_at desc);
create unique index if not exists idx_account_verification_one_pending
  on public.account_verification_requests(user_id)
  where status = 'pending';

alter table public.account_identity_status enable row level security;
alter table public.account_verification_requests enable row level security;

drop policy if exists account_identity_status_read on public.account_identity_status;
create policy account_identity_status_read
  on public.account_identity_status for select to authenticated
  using (user_id = (select auth.uid()) or verification_status = 'verified');

drop policy if exists account_verification_requests_read_own on public.account_verification_requests;
create policy account_verification_requests_read_own
  on public.account_verification_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists account_verification_requests_insert_own on public.account_verification_requests;
create policy account_verification_requests_insert_own
  on public.account_verification_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

-- No client INSERT/UPDATE/DELETE policies are granted for account_identity_status.
-- No client UPDATE/DELETE policies are granted for verification requests; review must be server-controlled.

create or replace function public.sync_zion_founder_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if lower(coalesce(new.email, '')) = 'veudaed@gmail.com' then
    insert into public.account_identity_status (
      user_id, is_founder, verification_status, verification_type, verified_at, updated_at
    )
    values (
      new.id,
      true,
      case when new.email_confirmed_at is not null then 'verified' else 'pending' end,
      'founder',
      new.email_confirmed_at,
      now()
    )
    on conflict (user_id) do update set
      is_founder = true,
      verification_status = case
        when excluded.verification_status = 'verified' then 'verified'
        when public.account_identity_status.verification_status = 'verified' then 'verified'
        else 'pending'
      end,
      verification_type = 'founder',
      verified_at = coalesce(public.account_identity_status.verified_at, excluded.verified_at),
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.sync_zion_founder_identity() from public, anon, authenticated;

drop trigger if exists zion_founder_identity_sync on auth.users;
create trigger zion_founder_identity_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_zion_founder_identity();

-- Backfill the designated founder account if it already exists.
insert into public.account_identity_status (
  user_id, is_founder, verification_status, verification_type, verified_at
)
select
  id,
  true,
  case when email_confirmed_at is not null then 'verified' else 'pending' end,
  'founder',
  email_confirmed_at
from auth.users
where lower(coalesce(email, '')) = 'veudaed@gmail.com'
on conflict (user_id) do update set
  is_founder = true,
  verification_status = case
    when excluded.verification_status = 'verified' then 'verified'
    when public.account_identity_status.verification_status = 'verified' then 'verified'
    else 'pending'
  end,
  verification_type = 'founder',
  verified_at = coalesce(public.account_identity_status.verified_at, excluded.verified_at),
  updated_at = now();
