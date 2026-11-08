\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('98200000-0000-4000-8000-000000000001','first-content-moderator@example.test'),
 ('98200000-0000-4000-8000-000000000002','content-owner-appeal@example.test'),
 ('98200000-0000-4000-8000-000000000003','second-content-moderator@example.test'),
 ('98200000-0000-4000-8000-000000000004','unrelated-content-member@example.test')
on conflict (id) do nothing;

insert into public.resa_contents(id,author_id,type,title,body,visibility,moderation_status)
values ('98200000-0000-4000-8000-000000000010','98200000-0000-4000-8000-000000000002','text','Appealable post','Content for enforcement test','public','active')
on conflict (id) do nothing;

-- A verified moderator issues a removal. The action and content state change atomically.
select set_config('request.jwt.claim.sub','98200000-0000-4000-8000-000000000001',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
declare v_action public.resa_moderation_actions%rowtype;
begin
  select * into v_action from private.resa_apply_content_moderation_action(
    '98200000-0000-4000-8000-000000000010','content_removed','A regra de segurança foi violada de forma verificável.'
  );
  if v_action.id is null or v_action.created_by <> auth.uid() then
    raise exception 'Moderation action was not auditable';
  end if;
  if not exists (select 1 from public.resa_contents where id='98200000-0000-4000-8000-000000000010' and moderation_status='removed') then
    raise exception 'Removed content state was not persisted';
  end if;
end;
$test$;
reset role;

-- The affected author can still see their own removed content and submit one appeal.
select set_config('request.jwt.claim.sub','98200000-0000-4000-8000-000000000002',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
declare v_action uuid;
begin
  if not exists (select 1 from public.resa_contents where id='98200000-0000-4000-8000-000000000010' and moderation_status='removed') then
    raise exception 'Content owner cannot see their own enforcement record';
  end if;
  select id into v_action from public.resa_moderation_actions
    where content_id='98200000-0000-4000-8000-000000000010' and status='active';
  insert into public.resa_content_moderation_appeals(action_id,appellant_id,reason,details)
  values(v_action,auth.uid(),'A publicação foi removida sem considerar o contexto completo.','Peço revisão integral do contexto.');
  begin
    update public.resa_contents set moderation_status='active'
      where id='98200000-0000-4000-8000-000000000010';
    raise exception 'Content owner bypassed moderation removal';
  exception when others then
    if sqlerrm = 'Content owner bypassed moderation removal' then raise; end if;
  end;
end;
$test$;
reset role;

-- An unrelated member cannot read the removed content or its appeal.
select set_config('request.jwt.claim.sub','98200000-0000-4000-8000-000000000004',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
begin
  if exists (select 1 from public.resa_contents where id='98200000-0000-4000-8000-000000000010') then
    raise exception 'Unrelated member can see removed content';
  end if;
  if exists (select 1 from public.resa_content_moderation_appeals) then
    raise exception 'Unrelated member can read appeal';
  end if;
end;
$test$;
reset role;

-- A different verified moderator overturns the action; content is restored.
select set_config('request.jwt.claim.sub','98200000-0000-4000-8000-000000000003',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
declare v_appeal uuid;
begin
  select id into v_appeal from public.resa_content_moderation_appeals
    where appellant_id='98200000-0000-4000-8000-000000000002';
  perform private.resa_decide_content_moderation_appeal(v_appeal,'overturned','A revisão independente concluiu que a remoção foi excessiva.');
  if not exists (select 1 from public.resa_moderation_actions where content_id='98200000-0000-4000-8000-000000000010' and status='revoked') then
    raise exception 'Overturned action was not revoked';
  end if;
  if not exists (select 1 from public.resa_contents where id='98200000-0000-4000-8000-000000000010' and moderation_status='active') then
    raise exception 'Overturned removal did not restore content';
  end if;
end;
$test$;
reset role;

rollback;
