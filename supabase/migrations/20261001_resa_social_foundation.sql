create extension if not exists pgcrypto;

alter table public.resa_contents add column if not exists quoted_content_id uuid references public.resa_contents(id) on delete set null;
create index if not exists resa_contents_quoted_idx on public.resa_contents(quoted_content_id);

create table if not exists public.resa_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  author_id uuid not null,
  parent_id uuid references public.resa_comments(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  status text not null default 'active' check (status in ('active','hidden','deleted','moderated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resa_comments_content_idx on public.resa_comments(content_id, created_at asc);
create index if not exists resa_comments_author_idx on public.resa_comments(author_id, created_at desc);
create index if not exists resa_comments_parent_idx on public.resa_comments(parent_id);

create table if not exists public.resa_reactions (
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  user_id uuid not null,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  primary key(content_id,user_id)
);
create index if not exists resa_reactions_user_idx on public.resa_reactions(user_id, created_at desc);

create table if not exists public.resa_mentions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  mentioned_user_id uuid not null,
  mentioned_by uuid not null,
  created_at timestamptz not null default now(),
  unique(content_id, mentioned_user_id)
);
create index if not exists resa_mentions_user_idx on public.resa_mentions(mentioned_user_id, created_at desc);

create table if not exists public.resa_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists resa_topics_name_idx on public.resa_topics(normalized_name);

create table if not exists public.resa_content_topics (
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  topic_id uuid not null references public.resa_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(content_id,topic_id)
);
create index if not exists resa_content_topics_topic_idx on public.resa_content_topics(topic_id,created_at desc);

create table if not exists public.resa_saves (
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(content_id,user_id)
);
create index if not exists resa_saves_user_idx on public.resa_saves(user_id,created_at desc);

create table if not exists public.resa_shares (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  user_id uuid not null,
  share_type text not null default 'repost' check (share_type in ('repost','share')),
  created_at timestamptz not null default now(),
  unique(content_id,user_id,share_type)
);
create index if not exists resa_shares_user_idx on public.resa_shares(user_id,created_at desc);

alter table public.resa_comments enable row level security;
alter table public.resa_reactions enable row level security;
alter table public.resa_mentions enable row level security;
alter table public.resa_topics enable row level security;
alter table public.resa_content_topics enable row level security;
alter table public.resa_saves enable row level security;
alter table public.resa_shares enable row level security;

drop policy if exists resa_comments_read on public.resa_comments;
create policy resa_comments_read on public.resa_comments for select using (
  exists (select 1 from public.resa_contents c where c.id = content_id and (c.visibility = 'public' or c.author_id = (select auth.uid())))
);
drop policy if exists resa_comments_insert on public.resa_comments;
create policy resa_comments_insert on public.resa_comments for insert with check (author_id = (select auth.uid()));
drop policy if exists resa_comments_update on public.resa_comments;
create policy resa_comments_update on public.resa_comments for update using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
drop policy if exists resa_comments_delete on public.resa_comments;
create policy resa_comments_delete on public.resa_comments for delete using (author_id = (select auth.uid()));

drop policy if exists resa_reactions_owner_all on public.resa_reactions;
create policy resa_reactions_owner_all on public.resa_reactions for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists resa_mentions_read on public.resa_mentions;
create policy resa_mentions_read on public.resa_mentions for select using (mentioned_user_id = (select auth.uid()) or mentioned_by = (select auth.uid()));
drop policy if exists resa_mentions_insert on public.resa_mentions;
create policy resa_mentions_insert on public.resa_mentions for insert with check (mentioned_by = (select auth.uid()));

drop policy if exists resa_topics_read on public.resa_topics;
create policy resa_topics_read on public.resa_topics for select using (true);
drop policy if exists resa_topics_insert on public.resa_topics;
create policy resa_topics_insert on public.resa_topics for insert with check ((select auth.uid()) is not null);

drop policy if exists resa_content_topics_read on public.resa_content_topics;
create policy resa_content_topics_read on public.resa_content_topics for select using (
  exists (select 1 from public.resa_contents c where c.id = content_id and (c.visibility = 'public' or c.author_id = (select auth.uid())))
);
drop policy if exists resa_content_topics_insert on public.resa_content_topics;
create policy resa_content_topics_insert on public.resa_content_topics for insert with check (
  exists (select 1 from public.resa_contents c where c.id = content_id and c.author_id = (select auth.uid()))
);

drop policy if exists resa_saves_owner_all on public.resa_saves;
create policy resa_saves_owner_all on public.resa_saves for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists resa_shares_read on public.resa_shares;
create policy resa_shares_read on public.resa_shares for select using ((select auth.uid()) is not null);
drop policy if exists resa_shares_insert on public.resa_shares;
create policy resa_shares_insert on public.resa_shares for insert with check (user_id = (select auth.uid()));
drop policy if exists resa_shares_delete on public.resa_shares;
create policy resa_shares_delete on public.resa_shares for delete using (user_id = (select auth.uid()));

-- Topics are globally readable; writes remain authenticated. Reposts and interactions are
-- intentionally append-oriented here; moderation/audit hooks will be added in the safety block.


-- Mentions create their own in-app notification through a controlled trigger.
-- No public notification INSERT policy is granted to end users.
create or replace function public.resa_mention_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id,type,title,body,channel,priority,data)
  values (
    new.mentioned_user_id,
    'resa.mention',
    'Você foi mencionado',
    'Você foi mencionado em uma publicação do RESA.',
    'in_app',
    'normal',
    jsonb_build_object('content_id', new.content_id, 'actor_id', new.mentioned_by)
  );
  return new;
end;
$$;

drop trigger if exists trg_resa_mention_notification on public.resa_mentions;
create trigger trg_resa_mention_notification
after insert on public.resa_mentions
for each row execute function public.resa_mention_notification();
