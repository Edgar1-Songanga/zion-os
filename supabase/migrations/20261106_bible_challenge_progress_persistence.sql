create table if not exists public.spiritual_bible_challenge_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint spiritual_bible_challenge_progress_state_object
    check (jsonb_typeof(state) = 'object')
);

alter table public.spiritual_bible_challenge_progress enable row level security;

drop policy if exists spiritual_bible_challenge_progress_owner_select
  on public.spiritual_bible_challenge_progress;
create policy spiritual_bible_challenge_progress_owner_select
  on public.spiritual_bible_challenge_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists spiritual_bible_challenge_progress_owner_insert
  on public.spiritual_bible_challenge_progress;
create policy spiritual_bible_challenge_progress_owner_insert
  on public.spiritual_bible_challenge_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists spiritual_bible_challenge_progress_owner_update
  on public.spiritual_bible_challenge_progress;
create policy spiritual_bible_challenge_progress_owner_update
  on public.spiritual_bible_challenge_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.spiritual_bible_challenge_progress from anon;
grant select, insert, update on public.spiritual_bible_challenge_progress to authenticated;
