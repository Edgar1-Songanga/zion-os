begin;

create table if not exists public.resa_user_mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint resa_user_mutes_no_self_mute check (muter_id <> muted_id)
);

create index if not exists resa_user_mutes_muted_idx
  on public.resa_user_mutes(muted_id, muter_id);

alter table public.resa_user_mutes enable row level security;
grant select, insert, delete on public.resa_user_mutes to authenticated;

drop policy if exists resa_user_mutes_read_self on public.resa_user_mutes;
create policy resa_user_mutes_read_self
on public.resa_user_mutes for select to authenticated
using ((select auth.uid()) is not null and muter_id = (select auth.uid()));

drop policy if exists resa_user_mutes_insert_self on public.resa_user_mutes;
create policy resa_user_mutes_insert_self
on public.resa_user_mutes for insert to authenticated
with check (
  (select auth.uid()) is not null
  and muter_id = (select auth.uid())
);

drop policy if exists resa_user_mutes_delete_self on public.resa_user_mutes;
create policy resa_user_mutes_delete_self
on public.resa_user_mutes for delete to authenticated
using ((select auth.uid()) is not null and muter_id = (select auth.uid()));

commit;
