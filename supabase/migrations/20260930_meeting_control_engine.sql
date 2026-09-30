-- ZION OS — Institutional Meeting Control Engine
-- Participant media/control state and room lock state.

create table if not exists public.governance_meeting_participant_controls (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.governance_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mic_muted boolean not null default false,
  camera_enabled boolean not null default true,
  screen_sharing boolean not null default false,
  hand_raised boolean not null default false,
  removed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meeting_id,user_id)
);

alter table public.governance_meeting_rooms
  add column if not exists locked boolean not null default false,
  add column if not exists lock_reason text;

create index if not exists idx_meeting_controls_meeting on public.governance_meeting_participant_controls(meeting_id);
create index if not exists idx_meeting_controls_user on public.governance_meeting_participant_controls(user_id);

alter table public.governance_meeting_participant_controls enable row level security;

create policy "meeting_controls_select_participants"
on public.governance_meeting_participant_controls for select to authenticated
using (exists (
  select 1 from public.governance_meeting_participants p
  where p.meeting_id = governance_meeting_participant_controls.meeting_id
    and p.user_id = (select auth.uid())
    and p.status in ('INVITED','ACCEPTED','PRESENT','LEFT')
));

create policy "meeting_controls_insert_participants"
on public.governance_meeting_participant_controls for insert to authenticated
with check (
  exists (
    select 1 from public.governance_meeting_participants p
    where p.meeting_id = governance_meeting_participant_controls.meeting_id
      and p.user_id = governance_meeting_participant_controls.user_id
      and p.status in ('INVITED','ACCEPTED','PRESENT')
  )
  and exists (
    select 1 from public.governance_meeting_participants actor
    where actor.meeting_id = governance_meeting_participant_controls.meeting_id
      and actor.user_id = (select auth.uid())
      and actor.status in ('INVITED','ACCEPTED','PRESENT')
  )
);

create policy "meeting_controls_update_self_or_moderator"
on public.governance_meeting_participant_controls for update to authenticated
using (exists (
  select 1 from public.governance_meeting_participants actor
  where actor.meeting_id = governance_meeting_participant_controls.meeting_id
    and actor.user_id = (select auth.uid())
    and actor.status in ('INVITED','ACCEPTED','PRESENT')
    and (
      actor.user_id = governance_meeting_participant_controls.user_id
      or actor.participant_role in ('HOST','MODERATOR')
    )
))
with check (exists (
  select 1 from public.governance_meeting_participants actor
  where actor.meeting_id = governance_meeting_participant_controls.meeting_id
    and actor.user_id = (select auth.uid())
    and actor.status in ('INVITED','ACCEPTED','PRESENT')
    and (
      actor.user_id = governance_meeting_participant_controls.user_id
      or actor.participant_role in ('HOST','MODERATOR')
    )
));

create policy "meeting_controls_delete_moderator"
on public.governance_meeting_participant_controls for delete to authenticated
using (exists (
  select 1 from public.governance_meeting_participants actor
  where actor.meeting_id = governance_meeting_participant_controls.meeting_id
    and actor.user_id = (select auth.uid())
    and actor.participant_role in ('HOST','MODERATOR')
    and actor.status in ('INVITED','ACCEPTED','PRESENT')
));

create or replace function private.set_governance_meeting_control_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog
as $
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_governance_meeting_controls_updated_at on public.governance_meeting_participant_controls;
create trigger trg_governance_meeting_controls_updated_at
before update on public.governance_meeting_participant_controls
for each row execute function private.set_governance_meeting_control_updated_at();
