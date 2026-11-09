-- Index foreign keys used for participant and moderator deletion checks.
create index if not exists resa_group_meeting_hand_raises_user_id_idx
  on public.resa_group_meeting_hand_raises (user_id);

create index if not exists resa_group_meeting_hand_raises_resolved_by_idx
  on public.resa_group_meeting_hand_raises (resolved_by);
