-- Keep founder identity state and its review queue synchronized.
alter table public.account_verification_requests
  drop constraint if exists account_verification_requests_requested_type_check;
alter table public.account_verification_requests
  add constraint account_verification_requests_requested_type_check
  check (requested_type in ('personal', 'professional', 'pastor', 'ministry', 'organization', 'founder'));

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

    if exists (
      select 1
      from public.account_identity_status
      where user_id = new.id and is_founder = true and verification_status = 'pending'
    ) then
      insert into public.account_verification_requests (user_id, requested_type, status)
      values (new.id, 'founder', 'pending')
      on conflict (user_id) where status = 'pending' do nothing;
    end if;
  else
    update public.account_identity_status
    set is_founder = false,
        verification_status = case when verification_type = 'founder' then 'not_verified' else verification_status end,
        verification_type = case when verification_type = 'founder' then null else verification_type end,
        verified_at = case when verification_type = 'founder' then null else verified_at end,
        updated_at = now()
    where user_id = new.id and is_founder = true;

    update public.account_verification_requests
    set status = 'cancelled',
        reviewed_at = now(),
        review_reason = 'Founder account designation changed'
    where user_id = new.id and requested_type = 'founder' and status = 'pending';
  end if;
  return new;
end;
$$;

revoke all on function public.sync_zion_founder_identity() from public, anon, authenticated;
drop trigger if exists zion_founder_identity_sync on auth.users;
create trigger zion_founder_identity_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_zion_founder_identity();

insert into public.account_verification_requests (user_id, requested_type, status)
select user_id, 'founder', 'pending'
from public.account_identity_status
where is_founder = true and verification_status = 'pending'
on conflict (user_id) where status = 'pending' do nothing;
