create table if not exists public.spiritual_bible_review_schedule (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null check (question_id > 0),
  due_at timestamptz not null,
  interval_days integer not null check (interval_days in (1, 3, 7, 14, 30)),
  repetitions integer not null default 0 check (repetitions >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists spiritual_bible_review_schedule_due_idx
  on public.spiritual_bible_review_schedule (user_id, due_at);

alter table public.spiritual_bible_review_schedule enable row level security;

drop policy if exists spiritual_bible_review_schedule_owner_select
  on public.spiritual_bible_review_schedule;
create policy spiritual_bible_review_schedule_owner_select
  on public.spiritual_bible_review_schedule
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists spiritual_bible_review_schedule_owner_insert
  on public.spiritual_bible_review_schedule;
create policy spiritual_bible_review_schedule_owner_insert
  on public.spiritual_bible_review_schedule
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists spiritual_bible_review_schedule_owner_update
  on public.spiritual_bible_review_schedule;
create policy spiritual_bible_review_schedule_owner_update
  on public.spiritual_bible_review_schedule
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.spiritual_bible_review_schedule from anon;
grant select, insert, update on public.spiritual_bible_review_schedule to authenticated;
