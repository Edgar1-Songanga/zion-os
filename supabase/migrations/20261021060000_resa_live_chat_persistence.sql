-- Persist RESA Live chat with live-session-scoped row security.
create table if not exists public.resa_live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists resa_live_chat_live_created_idx
  on public.resa_live_chat_messages (live_id, created_at asc);

alter table public.resa_live_chat_messages enable row level security;

drop policy if exists resa_live_chat_read_active on public.resa_live_chat_messages;
create policy resa_live_chat_read_active
  on public.resa_live_chat_messages for select to authenticated
  using (
    sender_id = (select auth.uid())
    or exists (
      select 1 from public.resa_live_sessions live
      where live.id = live_id
        and live.status = 'live'
        and (live.visibility = 'public' or live.host_id = (select auth.uid()))
    )
  );

drop policy if exists resa_live_chat_insert_active on public.resa_live_chat_messages;
create policy resa_live_chat_insert_active
  on public.resa_live_chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.resa_live_sessions live
      where live.id = live_id
        and live.status = 'live'
        and (live.visibility = 'public' or live.host_id = (select auth.uid()))
    )
  );

grant select, insert on public.resa_live_chat_messages to authenticated;
