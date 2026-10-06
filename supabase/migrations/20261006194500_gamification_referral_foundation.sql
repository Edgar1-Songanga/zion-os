create table if not exists public.zion_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.zion_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  code text not null references public.zion_referral_codes(code) on update cascade,
  status text not null default 'pending' check (status in ('pending','qualified','rejected')),
  created_at timestamptz not null default now(),
  qualified_at timestamptz
);

create index if not exists zion_referrals_referrer_idx on public.zion_referrals(referrer_user_id);
create index if not exists zion_referrals_referred_idx on public.zion_referrals(referred_user_id);
create index if not exists zion_referrals_code_idx on public.zion_referrals(code);

alter table public.zion_referral_codes enable row level security;
alter table public.zion_referrals enable row level security;

grant select, insert, update on public.zion_referral_codes to authenticated;
grant select, insert on public.zion_referrals to authenticated;

drop policy if exists "Users can read their own referral code" on public.zion_referral_codes;
create policy "Users can read their own referral code"
on public.zion_referral_codes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own referral code" on public.zion_referral_codes;
create policy "Users can create their own referral code"
on public.zion_referral_codes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own referral code" on public.zion_referral_codes;
create policy "Users can update their own referral code"
on public.zion_referral_codes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their referrals" on public.zion_referrals;
create policy "Users can read their referrals"
on public.zion_referrals for select to authenticated
using ((select auth.uid()) = referrer_user_id or (select auth.uid()) = referred_user_id);

drop policy if exists "Users can create referrals they initiate" on public.zion_referrals;
create policy "Users can create referrals they initiate"
on public.zion_referrals for insert to authenticated
with check ((select auth.uid()) = referrer_user_id);

revoke all on public.zion_referral_codes from anon;
revoke all on public.zion_referrals from anon;
