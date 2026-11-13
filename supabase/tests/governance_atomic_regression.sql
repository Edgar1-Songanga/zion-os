insert into public.governance_councils values
('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000010','MAJORITY_PRESENT',100),
('91000000-0000-4000-8000-000000000011','91000000-0000-4000-8000-000000000020','MAJORITY_PRESENT',50);
insert into public.governance_meetings values
('91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001'),
('91000000-0000-4000-8000-000000000012','91000000-0000-4000-8000-000000000011');
insert into public.governance_motions values
('91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000002'),
('91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000002'),
('91000000-0000-4000-8000-000000000013','91000000-0000-4000-8000-000000000012');
insert into public.organization_memberships values
('91000000-0000-4000-8000-000000000301','91000000-0000-4000-8000-000000000999'),
('91000000-0000-4000-8000-000000000302','91000000-0000-4000-8000-000000000998'),
('91000000-0000-4000-8000-000000000303','91000000-0000-4000-8000-000000000999');
insert into public.governance_council_members values
('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000301',true,'ACTIVE'),
('91000000-0000-4000-8000-000000000102','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000302',true,'ACTIVE'),
('91000000-0000-4000-8000-000000000103','91000000-0000-4000-8000-000000000011','91000000-0000-4000-8000-000000000303',true,'ACTIVE');
insert into public.governance_meeting_participants values
('91000000-0000-4000-8000-000000000201','91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000999','HOST','PRESENT'),
('91000000-0000-4000-8000-000000000202','91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000102','91000000-0000-4000-8000-000000000998','PARTICIPANT','DECLINED');
set role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000999',false);

do $governance_regression$
declare
  v_outcome text;
  v_quorum boolean;
  v_minutes_id uuid;
begin
  -- A member of another council cannot cast a vote against this motion,
  -- even when the authenticated user owns that other council membership.
  begin
    insert into public.governance_votes (motion_id,council_member_id,choice)
    values ('91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000103','YES');
    raise exception 'Cross-council vote unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  insert into public.governance_votes (motion_id,council_member_id,choice)
  values ('91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000101','YES');

  -- An insufficient quorum must never produce an approved decision.
  select outcome, quorum_met into v_outcome, v_quorum
  from public.record_governance_decision(
    '91000000-0000-4000-8000-000000000003','APPROVED'
  );
  if v_outcome <> 'NO_DECISION' or v_quorum then
    raise exception 'Decision was recorded without quorum';
  end if;

  update public.governance_meeting_participants
  set status = 'PRESENT'
  where id = '91000000-0000-4000-8000-000000000202';
  insert into public.governance_votes (motion_id,council_member_id,choice)
  values ('91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000101','YES');
  -- Each voter must submit only their own council-member identity.
  perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000998',true);
  insert into public.governance_votes (motion_id,council_member_id,choice)
  values ('91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000102','YES');
  perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000999',true);

  select outcome, quorum_met into v_outcome, v_quorum
  from public.record_governance_decision(
    '91000000-0000-4000-8000-000000000004','APPROVED'
  );
  if v_outcome <> 'APPROVED' or not v_quorum then
    raise exception 'Quorate governance decision was not recorded';
  end if;

  select id into v_minutes_id
  from public.save_governance_minutes(
    '91000000-0000-4000-8000-000000000002','Approved minutes regression','DRAFT'
  );
  perform * from public.save_governance_minutes(
    '91000000-0000-4000-8000-000000000002','Approved minutes regression','APPROVED'
  );

  begin
    perform * from public.save_governance_minutes(
      '91000000-0000-4000-8000-000000000002','Tampered after approval','DRAFT'
    );
    raise exception 'Approved minutes were mutable through RPC';
  exception when sqlstate '23514' then
    if sqlerrm not like '%approved_governance_minutes_are_immutable%' then raise; end if;
  end;

  begin
    update public.governance_minutes set content = 'Direct tampering'
    where id = v_minutes_id;
    raise exception 'Direct minutes UPDATE unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.governance_decisions (motion_id,outcome,yes_count,no_count,abstain_count,quorum_met)
    values ('91000000-0000-4000-8000-000000000003','APPROVED',1,0,0,true);
    raise exception 'Direct decision INSERT unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$governance_regression$;
reset role;
