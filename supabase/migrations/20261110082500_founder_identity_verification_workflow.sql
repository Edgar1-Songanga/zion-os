-- Persistent identity verification with an authenticated global-admin review workflow.
-- Email ownership identifies the designated founder account; it never verifies legal identity.

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
create index if not exists idx_account_verification_requests_pending
  on public.account_verification_requests(submitted_at asc) where status = 'pending';
create unique index if not exists idx_account_verification_one_pending
  on public.account_verification_requests(user_id) where status = 'pending';

alter table public.account_identity_status enable row level security;
alter table public.account_verification_requests enable row level security;

revoke all on table public.account_identity_status from anon, authenticated;
grant select, insert, update on table public.account_identity_status to authenticated;
revoke all on table public.account_verification_requests from anon, authenticated;
grant select, insert, update on table public.account_verification_requests to authenticated;

drop policy if exists account_identity_status_read on public.account_identity_status;
create policy account_identity_status_read on public.account_identity_status
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or verification_status = 'verified'
    or private.is_verified_zion_global_admin()
  );

drop policy if exists account_identity_status_admin_insert on public.account_identity_status;
create policy account_identity_status_admin_insert on public.account_identity_status
  for insert to authenticated
  with check (private.is_verified_zion_global_admin());

drop policy if exists account_identity_status_admin_update on public.account_identity_status;
create policy account_identity_status_admin_update on public.account_identity_status
  for update to authenticated
  using (private.is_verified_zion_global_admin())
  with check (private.is_verified_zion_global_admin());

drop policy if exists account_verification_requests_read on public.account_verification_requests;
create policy account_verification_requests_read on public.account_verification_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_verified_zion_global_admin());

drop policy if exists account_verification_requests_insert_own on public.account_verification_requests;
create policy account_verification_requests_insert_own on public.account_verification_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and review_reason is null
  );

drop policy if exists account_verification_requests_admin_update on public.account_verification_requests;
create policy account_verification_requests_admin_update on public.account_verification_requests
  for update to authenticated
  using (private.is_verified_zion_global_admin())
  with check (private.is_verified_zion_global_admin());

-- The review RPC is SECURITY INVOKER: RLS remains active. The global-admin
-- claim is server-managed app_metadata and is checked both here and in RLS.
create or replace function public.review_account_verification_request(
  p_request_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_request public.account_verification_requests%rowtype;
  v_status text;
  v_reason text;
begin
  if auth.uid() is null or not private.is_verified_zion_global_admin() then
    raise exception 'Verified global administrator required' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  v_reason := nullif(left(trim(coalesce(p_reason, '')), 1000), '');
  select * into v_request
  from public.account_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Verification request not found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Verification request is no longer pending' using errcode = '55000';
  end if;

  update public.account_verification_requests
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_reason = v_reason
  where id = p_request_id;

  v_status := case when p_decision = 'approved' then 'verified' else 'rejected' end;
  insert into public.account_identity_status (
    user_id, is_founder, verification_status, verification_type, verified_at, updated_at
  )
  values (
    v_request.user_id,
    false,
    v_status,
    v_request.requested_type,
    case when p_decision = 'approved' then now() else null end,
    now()
  )
  on conflict (user_id) do update set
    verification_status = excluded.verification_status,
    verification_type = excluded.verification_type,
    verified_at = excluded.verified_at,
    updated_at = now();

  return jsonb_build_object(
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'decision', p_decision,
    'verification_status', v_status,
    'reviewed_by', auth.uid(),
    'reviewed_at', now()
  );
end;
$$;

revoke all on function public.review_account_verification_request(uuid, text, text) from public, anon;
grant execute on function public.review_account_verification_request(uuid, text, text) to authenticated;

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
    values (new.id, true, 'pending', 'founder', null, now())
    on conflict (user_id) do update set
      is_founder = true,
      verification_status = case
        when current_status.verification_status = 'verified' then 'verified'
        else 'pending'
      end,
      verification_type = case
        when current_status.verification_status = 'verified' then current_status.verification_type
        else 'founder'
      end,
      verified_at = case
        when current_status.verification_status = 'verified' then current_status.verified_at
        else null
      end,
      updated_at = now();
  else
    update public.account_identity_status
    set is_founder = false,
        verification_status = case when verification_type = 'founder' then 'not_verified' else verification_status end,
        verification_type = case when verification_type = 'founder' then null else verification_type end,
        verified_at = case when verification_type = 'founder' then null else verified_at end,
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

insert into public.account_identity_status as current_status (
  user_id, is_founder, verification_status, verification_type, verified_at
)
select id, true, 'pending', 'founder', null
from auth.users
where lower(coalesce(email, '')) = 'veudaed@gmail.com'
on conflict (user_id) do update set
  is_founder = true,
  verification_status = case
    when current_status.verification_status = 'verified' then 'verified'
    else 'pending'
  end,
  verification_type = case
    when current_status.verification_status = 'verified' then current_status.verification_type
    else 'founder'
  end,
  verified_at = case
    when current_status.verification_status = 'verified' then current_status.verified_at
    else null
  end,
  updated_at = now();
