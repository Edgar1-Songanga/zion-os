-- ZION OS / RESA operational domains
-- Communities, events, messaging, moderation and search index contracts.
-- Supabase Auth remains the identity authority; RLS is the enforcement boundary.

create extension if not exists pgcrypto;

create table if not exists public.resa_communities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  visibility text not null default 'public' check (visibility in ('public','private','organization')),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resa_communities_org_idx on public.resa_communities(organization_id, created_at desc);
create index if not exists resa_communities_status_idx on public.resa_communities(status, created_at desc);

create table if not exists public.resa_community_members (
  community_id uuid not null references public.resa_communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  status text not null default 'active' check (status in ('active','invited','suspended','left')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists resa_community_members_user_idx on public.resa_community_members(user_id, joined_at desc);

alter table public.resa_contents add column if not exists community_id uuid references public.resa_communities(id) on delete set null;
create index if not exists resa_contents_community_idx on public.resa_contents(community_id, created_at desc);

create table if not exists public.resa_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  community_id uuid references public.resa_communities(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(trim(title)) between 2 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  meeting_url text,
  visibility text not null default 'public' check (visibility in ('public','followers','community','organization','private')),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists resa_events_start_idx on public.resa_events(starts_at asc, status);
create index if not exists resa_events_creator_idx on public.resa_events(created_by, starts_at desc);

create table if not exists public.resa_event_participants (
  event_id uuid not null references public.resa_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'interested' check (response in ('interested','going','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists resa_event_participants_user_idx on public.resa_event_participants(user_id, updated_at desc);

create table if not exists public.resa_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','group')),
  title text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resa_conversation_members (
  conversation_id uuid not null references public.resa_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index if not exists resa_conversation_members_user_idx on public.resa_conversation_members(user_id, joined_at desc);

create table if not exists public.resa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.resa_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 10000),
  status text not null default 'active' check (status in ('active','deleted','moderated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resa_messages_conversation_idx on public.resa_messages(conversation_id, created_at desc);
create index if not exists resa_messages_sender_idx on public.resa_messages(sender_id, created_at desc);

create table if not exists public.resa_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete restrict,
  content_id uuid references public.resa_contents(id) on delete cascade,
  message_id uuid references public.resa_messages(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','hate','sexual','violence','misinformation','copyright','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((content_id is not null) <> (message_id is not null))
);
create index if not exists resa_reports_queue_idx on public.resa_moderation_reports(status, created_at asc);
create index if not exists resa_reports_reporter_idx on public.resa_moderation_reports(reporter_id, created_at desc);

create table if not exists public.zion_search_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  body text,
  language text not null default 'pt',
  visibility text not null default 'public',
  organization_id uuid references public.organizations(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id)
);
create index if not exists zion_search_documents_type_idx on public.zion_search_documents(entity_type, updated_at desc);
create index if not exists zion_search_documents_language_idx on public.zion_search_documents(language, updated_at desc);

alter table public.resa_communities enable row level security;
alter table public.resa_community_members enable row level security;
alter table public.resa_events enable row level security;
alter table public.resa_event_participants enable row level security;
alter table public.resa_conversations enable row level security;
alter table public.resa_conversation_members enable row level security;
alter table public.resa_messages enable row level security;
alter table public.resa_moderation_reports enable row level security;
alter table public.zion_search_documents enable row level security;

-- Communities: public communities are discoverable; membership is owner-managed.
drop policy if exists resa_communities_read on public.resa_communities;
create policy resa_communities_read on public.resa_communities for select to authenticated using (
  status = 'active' and (visibility = 'public' or created_by = (select auth.uid()) or exists (
    select 1 from public.resa_community_members m where m.community_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
  ))
);
drop policy if exists resa_communities_insert on public.resa_communities;
create policy resa_communities_insert on public.resa_communities for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists resa_communities_update on public.resa_communities;
create policy resa_communities_update on public.resa_communities for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

drop policy if exists resa_community_members_read on public.resa_community_members;
create policy resa_community_members_read on public.resa_community_members for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.resa_community_members actor where actor.community_id = community_id and actor.user_id = (select auth.uid()) and actor.role in ('owner','moderator') and actor.status = 'active'
  )
);
drop policy if exists resa_community_members_insert on public.resa_community_members;
create policy resa_community_members_insert on public.resa_community_members for insert to authenticated with check (
  user_id = (select auth.uid()) or exists (select 1 from public.resa_communities c where c.id = community_id and c.created_by = (select auth.uid()))
);
drop policy if exists resa_community_members_update on public.resa_community_members;
create policy resa_community_members_update on public.resa_community_members for update to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.resa_community_members actor where actor.community_id = community_id and actor.user_id = (select auth.uid()) and actor.role in ('owner','moderator') and actor.status = 'active')
) with check (user_id = (select auth.uid()) or exists (select 1 from public.resa_community_members actor where actor.community_id = community_id and actor.user_id = (select auth.uid()) and actor.role in ('owner','moderator') and actor.status = 'active'));

drop policy if exists resa_events_read on public.resa_events;
create policy resa_events_read on public.resa_events for select to authenticated using (
  visibility = 'public' or created_by = (select auth.uid()) or exists (select 1 from public.resa_event_participants p where p.event_id = id and p.user_id = (select auth.uid()))
);
drop policy if exists resa_events_insert on public.resa_events;
create policy resa_events_insert on public.resa_events for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists resa_events_update on public.resa_events;
create policy resa_events_update on public.resa_events for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

drop policy if exists resa_event_participants_owner on public.resa_event_participants;
create policy resa_event_participants_owner on public.resa_event_participants for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists resa_conversations_member_read on public.resa_conversations;
create policy resa_conversations_member_read on public.resa_conversations for select to authenticated using (exists (select 1 from public.resa_conversation_members m where m.conversation_id = id and m.user_id = (select auth.uid())));
drop policy if exists resa_conversations_insert on public.resa_conversations;
create policy resa_conversations_insert on public.resa_conversations for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists resa_conversation_members_self on public.resa_conversation_members;
create policy resa_conversation_members_self on public.resa_conversation_members for all to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.resa_conversation_members actor where actor.conversation_id = conversation_id and actor.user_id = (select auth.uid()) and actor.role = 'owner')) with check (user_id = (select auth.uid()) or exists (select 1 from public.resa_conversation_members actor where actor.conversation_id = conversation_id and actor.user_id = (select auth.uid()) and actor.role = 'owner'));

drop policy if exists resa_messages_member on public.resa_messages;
create policy resa_messages_member on public.resa_messages for all to authenticated using (exists (select 1 from public.resa_conversation_members m where m.conversation_id = resa_messages.conversation_id and m.user_id = (select auth.uid()))) with check (sender_id = (select auth.uid()) and exists (select 1 from public.resa_conversation_members m where m.conversation_id = resa_messages.conversation_id and m.user_id = (select auth.uid())));

drop policy if exists resa_reports_insert on public.resa_moderation_reports;
create policy resa_reports_insert on public.resa_moderation_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists resa_reports_owner_read on public.resa_moderation_reports;
create policy resa_reports_owner_read on public.resa_moderation_reports for select to authenticated using (reporter_id = (select auth.uid()));

drop policy if exists zion_search_documents_read on public.zion_search_documents;
create policy zion_search_documents_read on public.zion_search_documents for select to authenticated using (visibility = 'public' or organization_id is null or private.is_org_member(organization_id));

-- Keep updated timestamps consistent for mutable operational entities.
create or replace function private.set_resa_operational_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_resa_communities_updated_at on public.resa_communities;
create trigger trg_resa_communities_updated_at before update on public.resa_communities for each row execute function private.set_resa_operational_updated_at();
drop trigger if exists trg_resa_events_updated_at on public.resa_events;
create trigger trg_resa_events_updated_at before update on public.resa_events for each row execute function private.set_resa_operational_updated_at();
drop trigger if exists trg_resa_event_participants_updated_at on public.resa_event_participants;
create trigger trg_resa_event_participants_updated_at before update on public.resa_event_participants for each row execute function private.set_resa_operational_updated_at();
drop trigger if exists trg_resa_conversations_updated_at on public.resa_conversations;
create trigger trg_resa_conversations_updated_at before update on public.resa_conversations for each row execute function private.set_resa_operational_updated_at();
drop trigger if exists trg_resa_messages_updated_at on public.resa_messages;
create trigger trg_resa_messages_updated_at before update on public.resa_messages for each row execute function private.set_resa_operational_updated_at();
