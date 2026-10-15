-- Persistent founder identity and verification requests.
-- Founder recognition is tied to the designated account email, not signup order or display name.
-- Confirming an email proves mailbox access; it does NOT verify a person's identity.

create table if not exists public.account_identity_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_founder boolean not null default false,
  verification_status text not null default 'not_verified'
    check (verification_status in ('not_verified', 'pending', 'verified', 'rejected', 'suspended')),
  verification_type text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- Explicit Data API privileges: RLS policies then restrict which rows are visible or insertable.
revoke all on table public.account_identity_status from anon;
revoke all on table public.account_identity_status from authenticated;
grant select on table public.account_identity_status to authenticated;

revoke all on table public.account_verification_requests from anon;
revoke all on table public.account_verification_requests from authenticated;
grant select, insert on table public.account_verification_requests to authenticated;

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

-- Clients cannot change identity status or mutate/review requests after submission.
-- A separately authorized server-side review workflow must perform approvals/rejections.

create or replace function public.sync_zion_founder_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if lower(coalesce(new.email, '')) = 'veudaed@gmail.com' then
    insert into public.account_identity_status as current_status (
      user_id, is_founder, verification_status, verification_type, verified_at, updated_at
    )
    values (
      new.id,
      true,
      'pending',
      'founder',
      null,
      now()
    )
    on conflict (user_id) do update set
      is_founder = true,
      verification_status = case
        when current_status.verification_status = 'verified'
          and current_status.verification_type is distinct from 'founder'
          then 'verified'
        else 'pending'
      end,
      verification_type = case
        when current_status.verification_status = 'verified'
          and current_status.verification_type is distinct from 'founder'
          then current_status.verification_type
        else 'founder'
      end,
      verified_at = case
        when current_status.verification_status = 'verified'
          and current_status.verification_type is distinct from 'founder'
          then current_status.verified_at
        else null
      end,
      updated_at = now();
  else
    -- If the designated email is changed away, remove founder recognition.
    -- Preserve any independently verified identity that is not founder-only.
    update public.account_identity_status
    set is_founder = false,
        verification_status = case
          when verification_type = 'founder' then 'not_verified'
          else verification_status
        end,
        verification_type = case
          when verification_type = 'founder' then null
          else verification_type
        end,
        verified_at = case
          when verification_type = 'founder' then null
          else verified_at
        end,
        updated_at = now()
    where user_id = new.id and is_founder = true;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_zion_founder_identity() from public, anon, authenticated;

drop trigger if exists zion_founder_identity_sync on auth.users;
create trigger zion_founder_identity_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_zion_founder_identity();

-- Backfill the designated founder account as recognized but NOT identity-verified.
insert into public.account_identity_status as current_status (
  user_id, is_founder, verification_status, verification_type, verified_at
)
select
  id,
  true,
  'pending',
  'founder',
  null
from auth.users
where lower(coalesce(email, '')) = 'veudaed@gmail.com'
on conflict (user_id) do update set
  is_founder = true,
  verification_status = case
    when current_status.verification_status = 'verified'
      and current_status.verification_type is distinct from 'founder'
      then 'verified'
    else 'pending'
  end,
  verification_type = case
    when current_status.verification_status = 'verified'
      and current_status.verification_type is distinct from 'founder'
      then current_status.verification_type
    else 'founder'
  end,
  verified_at = case
    when current_status.verification_status = 'verified'
      and current_status.verification_type is distinct from 'founder'
      then current_status.verified_at
    else null
  end,
  updated_at = now();
