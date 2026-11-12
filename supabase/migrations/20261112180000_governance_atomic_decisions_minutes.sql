-- Serialize official governance decisions and minutes at the database boundary.
-- SECURITY INVOKER preserves the caller's JWT and all existing RLS policies.

create or replace function public.record_governance_decision(
  p_motion_id uuid,
  p_outcome text
)
returns setof public.governance_decisions
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_org_id uuid;
  v_meeting_id uuid;
  v_council_id uuid;
  v_quorum_type text;
  v_quorum_value integer;
  v_eligible integer := 0;
  v_present integer := 0;
  v_yes integer := 0;
  v_no integer := 0;
  v_abstain integer := 0;
  v_quorum_met boolean := false;
  v_decision public.governance_decisions%rowtype;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_outcome not in ('APPROVED', 'REJECTED', 'NO_DECISION') then
    raise exception 'invalid_governance_outcome' using errcode = '22023';
  end if;

  select m.meeting_id, c.id, c.organization_id, c.quorum_type, c.quorum_value
    into v_meeting_id, v_council_id, v_org_id, v_quorum_type, v_quorum_value
  from public.governance_motions m
  join public.governance_meetings gm on gm.id = m.meeting_id
  join public.governance_councils c on c.id = gm.council_id
  where m.id = p_motion_id
  for update of m;

  if not found then
    raise exception 'governance_motion_not_found' using errcode = 'P0002';
  end if;
  if not private.has_org_permission(v_org_id, 'meeting.manage') then
    raise exception 'meeting_manage_permission_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.governance_decisions d where d.motion_id = p_motion_id) then
    raise exception 'governance_motion_already_decided' using errcode = '23505';
  end if;

  select count(*)::integer into v_eligible
  from public.governance_council_members cm
  where cm.council_id = v_council_id
    and cm.is_voting_member = true
    and cm.status = 'ACTIVE';

  select count(distinct cm.id)::integer into v_present
  from public.governance_council_members cm
  join public.governance_meeting_participants mp
    on mp.council_member_id = cm.id
   and mp.meeting_id = v_meeting_id
   and mp.status in ('PRESENT', 'LEFT')
  where cm.council_id = v_council_id
    and cm.is_voting_member = true
    and cm.status = 'ACTIVE';

  if v_quorum_type = 'FIXED_COUNT' then
    v_quorum_met := v_present >= coalesce(v_quorum_value, 0);
  else
    v_quorum_met := v_eligible > 0
      and (v_present::numeric / v_eligible::numeric) * 100 >= coalesce(v_quorum_value, 50);
  end if;

  select
    count(*) filter (where gv.choice = 'YES')::integer,
    count(*) filter (where gv.choice = 'NO')::integer,
    count(*) filter (where gv.choice = 'ABSTAIN')::integer
  into v_yes, v_no, v_abstain
  from public.governance_votes gv
  join public.governance_council_members cm
    on cm.id = gv.council_member_id
   and cm.council_id = v_council_id
   and cm.is_voting_member = true
   and cm.status = 'ACTIVE'
  join public.governance_meeting_participants mp
    on mp.council_member_id = cm.id
   and mp.meeting_id = v_meeting_id
   and mp.status in ('PRESENT', 'LEFT')
  where gv.motion_id = p_motion_id;

  insert into public.governance_decisions (
    motion_id, outcome, yes_count, no_count, abstain_count, quorum_met, decided_by
  ) values (
    p_motion_id,
    case when v_quorum_met then p_outcome else 'NO_DECISION' end,
    coalesce(v_yes, 0), coalesce(v_no, 0), coalesce(v_abstain, 0), v_quorum_met, v_actor
  )
  returning * into v_decision;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    v_org_id, v_actor, 'governance.decision.recorded', 'governance_decision',
    v_decision.id,
    jsonb_build_object(
      'motion_id', p_motion_id,
      'outcome', v_decision.outcome,
      'quorum_met', v_quorum_met,
      'yes_count', coalesce(v_yes, 0),
      'no_count', coalesce(v_no, 0),
      'abstain_count', coalesce(v_abstain, 0)
    )
  );

  return next v_decision;
end;
$$;

revoke all on function public.record_governance_decision(uuid, text) from public, anon;
grant execute on function public.record_governance_decision(uuid, text) to authenticated;


create or replace function public.save_governance_minutes(
  p_meeting_id uuid,
  p_content text,
  p_status text default 'DRAFT'
)
returns setof public.governance_minutes
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_org_id uuid;
  v_existing public.governance_minutes%rowtype;
  v_saved public.governance_minutes%rowtype;
  v_is_approver boolean := false;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_status not in ('DRAFT', 'APPROVED') then
    raise exception 'invalid_governance_minutes_status' using errcode = '22023';
  end if;
  if nullif(btrim(p_content), '') is null then
    raise exception 'governance_minutes_content_required' using errcode = '22023';
  end if;

  select c.organization_id into v_org_id
  from public.governance_meetings gm
  join public.governance_councils c on c.id = gm.council_id
  where gm.id = p_meeting_id
  for update of gm;

  if not found then
    raise exception 'governance_meeting_not_found' using errcode = 'P0002';
  end if;
  if not private.has_org_permission(v_org_id, 'meeting.manage') then
    raise exception 'meeting_manage_permission_required' using errcode = '42501';
  end if;

  select * into v_existing
  from public.governance_minutes
  where meeting_id = p_meeting_id
  for update;

  if found and v_existing.status = 'APPROVED' then
    raise exception 'approved_governance_minutes_are_immutable' using errcode = '23514';
  end if;

  if p_status = 'APPROVED' then
    select exists (
      select 1
      from public.governance_meeting_participants mp
      where mp.meeting_id = p_meeting_id
        and mp.user_id = v_actor
        and mp.participant_role in ('HOST', 'SECRETARY')
        and mp.status in ('INVITED', 'ACCEPTED', 'PRESENT', 'LEFT')
    ) into v_is_approver;

    if not v_is_approver then
      raise exception 'minutes_approval_requires_host_or_secretary' using errcode = '42501';
    end if;
  end if;

  if v_existing.id is null then
    insert into public.governance_minutes (
      meeting_id, content, status, created_by, approved_at, approved_by
    ) values (
      p_meeting_id, p_content, p_status, v_actor,
      case when p_status = 'APPROVED' then now() else null end,
      case when p_status = 'APPROVED' then v_actor else null end
    )
    returning * into v_saved;
  else
    update public.governance_minutes
    set content = p_content,
        status = p_status,
        approved_at = case when p_status = 'APPROVED' then now() else null end,
        approved_by = case when p_status = 'APPROVED' then v_actor else null end,
        updated_at = now()
    where id = v_existing.id
    returning * into v_saved;
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    v_org_id, v_actor,
    case when p_status = 'APPROVED' then 'governance.minutes.approved' else 'governance.minutes.saved' end,
    'governance_minutes', v_saved.id,
    jsonb_build_object('meeting_id', p_meeting_id, 'status', p_status)
  );

  return next v_saved;
end;
$$;

revoke all on function public.save_governance_minutes(uuid, text, text) from public, anon;
grant execute on function public.save_governance_minutes(uuid, text, text) to authenticated;
