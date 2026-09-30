create extension if not exists pgcrypto;

create table if not exists public.resa_contents (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  type text not null check (type in ('text','image','video','short_video','audio','live','story','article','bible_study','sermon','testimony','prayer')),
  title text,
  body text,
  visibility text not null default 'public' check (visibility in ('public','followers','community','organization','private')),
  language text not null default 'pt',
  organization_id uuid,
  ministry_id uuid,
  scripture_references text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resa_contents_author_idx on public.resa_contents(author_id, created_at desc);
create index if not exists resa_contents_visibility_idx on public.resa_contents(visibility, created_at desc);
create index if not exists resa_contents_org_idx on public.resa_contents(organization_id, created_at desc);

alter table public.resa_contents enable row level security;

drop policy if exists resa_contents_public_read on public.resa_contents;
create policy resa_contents_public_read on public.resa_contents
for select using (visibility = 'public' or author_id = auth.uid());

drop policy if exists resa_contents_owner_insert on public.resa_contents;
create policy resa_contents_owner_insert on public.resa_contents
for insert with check (author_id = auth.uid());

drop policy if exists resa_contents_owner_update on public.resa_contents;
create policy resa_contents_owner_update on public.resa_contents
for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists resa_contents_owner_delete on public.resa_contents;
create policy resa_contents_owner_delete on public.resa_contents
for delete using (author_id = auth.uid());

create table if not exists public.resa_follows (
  follower_id uuid not null,
  followed_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists resa_follows_followed_idx on public.resa_follows(followed_id, created_at desc);

alter table public.resa_follows enable row level security;

drop policy if exists resa_follows_owner_read on public.resa_follows;
create policy resa_follows_owner_read on public.resa_follows
for select using (follower_id = auth.uid() or followed_id = auth.uid());

drop policy if exists resa_follows_owner_insert on public.resa_follows;
create policy resa_follows_owner_insert on public.resa_follows
for insert with check (follower_id = auth.uid());

drop policy if exists resa_follows_owner_delete on public.resa_follows;
create policy resa_follows_owner_delete on public.resa_follows
for delete using (follower_id = auth.uid());

create table if not exists public.resa_live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  title text not null,
  description text,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  visibility text not null default 'public' check (visibility in ('public','followers','community','organization','private')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists resa_live_status_idx on public.resa_live_sessions(status, scheduled_at);
create index if not exists resa_live_host_idx on public.resa_live_sessions(host_id, created_at desc);

alter table public.resa_live_sessions enable row level security;

drop policy if exists resa_live_public_read on public.resa_live_sessions;
create policy resa_live_public_read on public.resa_live_sessions
for select using (visibility = 'public' or host_id = auth.uid());

drop policy if exists resa_live_host_insert on public.resa_live_sessions;
create policy resa_live_host_insert on public.resa_live_sessions
for insert with check (host_id = auth.uid());

drop policy if exists resa_live_host_update on public.resa_live_sessions;
create policy resa_live_host_update on public.resa_live_sessions
for update using (host_id = auth.uid()) with check (host_id = auth.uid());

create table if not exists public.notification_preferences (
  user_id uuid primary key,
  enabled boolean not null default true,
  channels text[] not null default array['in_app']::text[],
  muted_types text[] not null default '{}',
  quiet_start time,
  quiet_end time,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_owner_all on public.notification_preferences;
create policy notification_preferences_owner_all on public.notification_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text not null,
  channel text not null check (channel in ('in_app','push','email')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, read_at) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications
for select using (user_id = auth.uid());

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
