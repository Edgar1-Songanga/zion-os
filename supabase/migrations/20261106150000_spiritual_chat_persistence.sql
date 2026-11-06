create table if not exists public.spiritual_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spiritual_chat_conversations_id_user_unique unique (id, user_id)
);

create index if not exists spiritual_chat_conversations_user_updated_idx
  on public.spiritual_chat_conversations(user_id, updated_at desc);

create table if not exists public.spiritual_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint spiritual_chat_message_owner_matches_conversation
    foreign key (conversation_id, user_id)
    references public.spiritual_chat_conversations(id, user_id)
    on delete cascade
);

create index if not exists spiritual_chat_messages_conversation_created_idx
  on public.spiritual_chat_messages(conversation_id, created_at asc);

alter table public.spiritual_chat_conversations enable row level security;
alter table public.spiritual_chat_messages enable row level security;

drop policy if exists spiritual_chat_conversations_owner_select on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_select
  on public.spiritual_chat_conversations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists spiritual_chat_conversations_owner_insert on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_insert
  on public.spiritual_chat_conversations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists spiritual_chat_conversations_owner_update on public.spiritual_chat_conversations;
create policy spiritual_chat_conversations_owner_update
  on public.spiritual_chat_conversations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists spiritual_chat_messages_owner_select on public.spiritual_chat_messages;
create policy spiritual_chat_messages_owner_select
  on public.spiritual_chat_messages for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.spiritual_chat_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

drop policy if exists spiritual_chat_messages_owner_insert on public.spiritual_chat_messages;
create policy spiritual_chat_messages_owner_insert
  on public.spiritual_chat_messages for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.spiritual_chat_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

grant select, insert, update on public.spiritual_chat_conversations to authenticated;
grant select, insert on public.spiritual_chat_messages to authenticated;
