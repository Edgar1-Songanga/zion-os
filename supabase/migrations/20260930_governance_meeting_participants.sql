create table if not exists public.governance_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.governance_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  council_member_id uuid references public.governance_council_members(id) on delete set null,
  participant_role text not null default 'PARTICIPANT',
  status text not null default 'INVITED',
  is_host boolean not null default false,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique(meeting_id, user_id),
  constraint governance_meeting_participants_status_chk check (status in ('INVITED','ACCEPTED','DECLINED','PRESENT','LEFT','REMOVED')),
  constraint governance_meeting_participants_role_chk check (participant_role in ('HOST','MODERATOR','SECRETARY','PARTICIPANT','OBSERVER'))
);

create index if not exists idx_gov_meeting_participants_meeting on public.governance_meeting_participants(meeting_id);
create index if not exists idx_gov_meeting_participants_user on public.governance_meeting_participants(user_id);
create index if not exists idx_gov_meeting_participants_status on public.governance_meeting_participants(meeting_id,status);

alter table public.governance_meeting_participants enable row level security;

create policy "meeting_participants_select_org_members"
on public.governance_meeting_participants for select to authenticated
using (
  exists (
    select 1 from public.governance_meetings gm
    join public.governance_councils gc on gc.id = gm.council_id
    where gm.id = governance_meeting_participants.meeting_id
      and private.is_org_member(gc.organization_id)
  )
);

create policy "meeting_participants_insert_manage"
on public.governance_meeting_participants for insert to authenticated
with check (
  exists (
    select 1 from public.governance_meetings gm
    join public.governance_councils gc on gc.id = gm.council_id
    where gm.id = governance_meeting_participants.meeting_id
      and private.has_org_permission(gc.organization_id, 'meeting.manage')
  )
);

create policy "meeting_participants_update_manage"
on public.governance_meeting_participants for update to authenticated
using (
  exists (
    select 1 from public.governance_meetings gm
    join public.governance_councils gc on gc.id = gm.council_id
    where gm.id = governance_meeting_participants.meeting_id
      and private.has_org_permission(gc.organization_id, 'meeting.manage')
  )
)
with check (
  exists (
    select 1 from public.governance_meetings gm
    join public.governance_councils gc on gc.id = gm.council_id
    where gm.id = governance_meeting_participants.meeting_id
      and private.has_org_permission(gc.organization_id, 'meeting.manage')
  )
);

create policy "meeting_participants_update_self_presence"
on public.governance_meeting_participants for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "meetings_update_manage"
on public.governance_meetings for update to authenticated
using (
  exists (
    select 1 from public.governance_councils gc
    where gc.id = governance_meetings.council_id
      and private.has_org_permission(gc.organization_id, 'meeting.manage')
  )
)
with check (
  exists (
    select 1 from public.governance_councils gc
    where gc.id = governance_meetings.council_id
      and private.has_org_permission(gc.organization_id, 'meeting.manage')
  )
);
