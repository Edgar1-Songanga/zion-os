-- Guarded workflow RPCs for church membership transfers and disciplinary lifting.
-- Notifications are queued idempotently through zion_jobs; the existing worker must be deployed
-- and notification.dispatch must be handled by the notification delivery worker.
create or replace function public.request_membership_transfer(
  p_membership_id uuid,
  p_destination_organization_id uuid,
  p_reason text default null
) returns public.membership_transfer_requests
language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_membership public.organization_memberships%rowtype;
  v_destination public.organizations%rowtype;
  v_request public.membership_transfer_requests%rowtype;
begin
  if v_actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_membership_id is null or p_destination_organization_id is null then
    raise exception 'membership and destination are required' using errcode='22023';
  end if;
  select * into v_membership from public.organization_memberships
    where id=p_membership_id and user_id=v_actor and status='ACTIVE' for update;
  if not found then raise exception 'active membership not found for current user' using errcode='42501'; end if;
  if v_membership.organization_id=p_destination_organization_id then
    raise exception 'destination must differ from source church' using errcode='22023';
  end if;
  select * into v_destination from public.organizations
    where id=p_destination_organization_id and is_active=true;
  if not found then raise exception 'destination church is unavailable' using errcode='22023'; end if;
  if exists (select 1 from public.membership_transfer_requests r
      where r.membership_id=p_membership_id and r.status in
      ('SUBMITTED','SOURCE_REVIEW','SOURCE_APPROVED','DESTINATION_REVIEW','DESTINATION_APPROVED')) then
    raise exception 'an active transfer request already exists' using errcode='23505';
  end if;
  insert into public.membership_transfer_requests
    (requester_user_id,membership_id,source_organization_id,destination_organization_id,reason)
    values (v_actor,p_membership_id,v_membership.organization_id,p_destination_organization_id,left(nullif(btrim(p_reason),''),2000))
    returning * into v_request;
  insert into public.membership_transfer_events
    (transfer_request_id,actor_user_id,event_type,from_status,to_status)
    values (v_request.id,v_actor,'TRANSFER_REQUESTED',null,'SUBMITTED');
  return v_request;
end $$;

create or replace function public.decide_membership_transfer(
  p_transfer_request_id uuid,
  p_decision text,
  p_note text default null
) returns public.membership_transfer_requests
language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.membership_transfer_requests%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_old_status text;
  v_role_id uuid;
begin
  if v_actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_decision not in ('APPROVE','REJECT') then raise exception 'decision must be APPROVE or REJECT' using errcode='22023'; end if;
  select * into v_request from public.membership_transfer_requests
    where id=p_transfer_request_id for update;
  if not found then raise exception 'transfer request not found' using errcode='P0002'; end if;
  v_old_status := v_request.status;
  if v_request.expires_at <= now() then
    update public.membership_transfer_requests set status='EXPIRED',updated_at=now() where id=v_request.id returning * into v_request;
    insert into public.membership_transfer_events(transfer_request_id,actor_user_id,event_type,from_status,to_status)
      values(v_request.id,v_actor,'TRANSFER_EXPIRED',v_old_status,'EXPIRED');
    return v_request;
  end if;

  if v_request.status in ('SUBMITTED','SOURCE_REVIEW') then
    if not private.has_org_permission(v_request.source_organization_id,'membership.manage') then
      raise exception 'source church membership-management permission required' using errcode='42501';
    end if;
    if p_decision='REJECT' then
      update public.membership_transfer_requests set status='SOURCE_REJECTED',source_decided_by=v_actor,
        source_decided_at=now(),source_decision_note=left(p_note,2000),updated_at=now()
        where id=v_request.id returning * into v_request;
    else
      update public.membership_transfer_requests set status='SOURCE_APPROVED',source_decided_by=v_actor,
        source_decided_at=now(),source_decision_note=left(p_note,2000),updated_at=now()
        where id=v_request.id returning * into v_request;
    end if;
  elsif v_request.status='SOURCE_APPROVED' or v_request.status='DESTINATION_REVIEW' then
    if not private.has_org_permission(v_request.destination_organization_id,'membership.manage') then
      raise exception 'destination church membership-management permission required' using errcode='42501';
    end if;
    if p_decision='REJECT' then
      update public.membership_transfer_requests set status='DESTINATION_REJECTED',destination_decided_by=v_actor,
        destination_decided_at=now(),destination_decision_note=left(p_note,2000),updated_at=now()
        where id=v_request.id returning * into v_request;
    else
      select * into v_membership from public.organization_memberships
        where id=v_request.membership_id and user_id=v_request.requester_user_id and status='ACTIVE' for update;
      if not found then raise exception 'source membership is no longer active; transfer cannot complete' using errcode='23514'; end if;
      if exists(select 1 from public.organization_memberships where organization_id=v_request.destination_organization_id
          and user_id=v_request.requester_user_id and status='ACTIVE') then
        raise exception 'member already has an active membership at destination' using errcode='23505';
      end if;
      update public.organization_memberships set status='INACTIVE'
        where id=v_request.membership_id and status='ACTIVE';
      insert into public.organization_memberships(organization_id,user_id,role_id,status)
        values(v_request.destination_organization_id,v_request.requester_user_id,v_membership.role_id,'ACTIVE');
      update public.membership_transfer_requests set status='COMPLETED',destination_decided_by=v_actor,
        destination_decided_at=now(),destination_decision_note=left(p_note,2000),completed_at=now(),updated_at=now()
        where id=v_request.id returning * into v_request;
    end if;
  else
    raise exception 'transfer request is not awaiting a decision' using errcode='55000';
  end if;

  insert into public.membership_transfer_events(transfer_request_id,actor_user_id,event_type,from_status,to_status,note)
    values(v_request.id,v_actor,case when p_decision='APPROVE' then 'TRANSFER_APPROVED' else 'TRANSFER_REJECTED' end,
      v_old_status,v_request.status,left(p_note,2000));
  return v_request;
end $$;

create or replace function public.lift_membership_disciplinary_case(
  p_case_id uuid,
  p_vote_number text,
  p_minutes_reference text,
  p_decision_date date,
  p_authority text,
  p_note text default null
) returns public.membership_disciplinary_cases
language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.membership_disciplinary_cases%rowtype;
begin
  if v_actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into v_case from public.membership_disciplinary_cases where id=p_case_id for update;
  if not found then raise exception 'disciplinary case not found' using errcode='P0002'; end if;
  if not private.has_org_permission(v_case.organization_id,'membership.manage') then
    raise exception 'membership-management permission required' using errcode='42501';
  end if;
  if v_case.status <> 'ACTIVE' then raise exception 'only active measures can be lifted' using errcode='55000'; end if;
  if nullif(btrim(p_vote_number),'') is null or nullif(btrim(p_minutes_reference),'') is null
    or p_decision_date is null or p_authority not in ('CHURCH_BOARD','CHURCH_BUSINESS_MEETING','CONFERENCE_OR_MISSION','OTHER_AUTHORIZED_BODY') then
    raise exception 'valid vote, minutes, date and authority are required' using errcode='22023';
  end if;
  update public.membership_disciplinary_cases set status='LIFTED',lifted_at=now(),lifted_by=v_actor,
    lifting_vote_number=left(btrim(p_vote_number),200),lifting_minutes_reference=left(btrim(p_minutes_reference),500),
    lifting_decision_date=p_decision_date,lifting_authority=p_authority,lifting_note=left(p_note,2000),updated_at=now()
    where id=p_case_id returning * into v_case;
  return v_case;
end $$;

revoke all on function public.request_membership_transfer(uuid,uuid,text) from public, anon;
revoke all on function public.decide_membership_transfer(uuid,text,text) from public, anon;
revoke all on function public.lift_membership_disciplinary_case(uuid,text,text,date,text,text) from public, anon;
grant execute on function public.request_membership_transfer(uuid,uuid,text) to authenticated;
grant execute on function public.decide_membership_transfer(uuid,text,text) to authenticated;
grant execute on function public.lift_membership_disciplinary_case(uuid,text,text,date,text,text) to authenticated;
