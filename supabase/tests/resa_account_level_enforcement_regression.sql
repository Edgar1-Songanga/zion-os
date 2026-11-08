\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
 ('98300000-0000-4000-8000-000000000001','resa-sanction-admin-one@example.test'),
 ('98300000-0000-4000-8000-000000000002','resa-sanction-target@example.test'),
 ('98300000-0000-4000-8000-000000000003','resa-sanction-admin-two@example.test')
on conflict (id) do nothing;

-- First global administrator creates a temporary publishing restriction.
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000001',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
declare v_sanction public.resa_account_sanctions%rowtype;
begin
  select * into v_sanction from private.resa_admin_create_account_sanction(
    '98300000-0000-4000-8000-000000000002','publishing',
    'Publicações repetidas violaram a política comunitária.',now()+interval '2 hours'
  );
  if v_sanction.id is null or v_sanction.created_by<>auth.uid() then raise exception 'Sanction audit record missing'; end if;
end;
$test$;
reset role;

-- The sanctioned user cannot publish directly through Postgres, but can still read their own sanction and appeal.
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000002',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
declare v_sanction uuid;
begin
  select id into v_sanction from public.resa_account_sanctions where target_user_id=auth.uid() and status='active';
  if v_sanction is null then raise exception 'Sanction history is not visible to the affected user'; end if;
  begin
    insert into public.resa_contents(author_id,type,title,body,visibility)
    values(auth.uid(),'text','Blocked publish','This must be rejected','public');
    raise exception 'Publishing restriction was bypassed';
  exception when insufficient_privilege then
    null;
  end;
  perform private.resa_submit_account_sanction_appeal(v_sanction,'A decisão não considerou o contexto da publicação.','Peço uma revisão independente.');
end;
$test$;
reset role;

-- An unrelated member cannot read another user's sanctions or appeal.
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000003',false);
select set_config('test.zion_global_admin','false',false);
set role authenticated;
do $test$
begin
  if exists(select 1 from public.resa_account_sanctions where target_user_id='98300000-0000-4000-8000-000000000002') then
    raise exception 'Unrelated user can read private sanctions';
  end if;
  if exists(select 1 from public.resa_account_sanction_appeals) then
    raise exception 'Unrelated user can read private appeals';
  end if;
end;
$test$;
reset role;

-- A different verified global administrator overturns the sanction.
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000003',false);
select set_config('test.zion_global_admin','true',false);
set role authenticated;
do $test$
declare v_appeal uuid;
begin
  select id into v_appeal from public.resa_account_sanction_appeals
    where appellant_id='98300000-0000-4000-8000-000000000002';
  perform private.resa_admin_decide_account_sanction_appeal(
    v_appeal,'overturned','A revisão independente concluiu que a sanção foi aplicada incorretamente.'
  );
  if not exists(select 1 from public.resa_account_sanctions where target_user_id='98300000-0000-4000-8000-000000000002' and status='revoked') then
    raise exception 'Overturned sanction was not revoked';
  end if;
end;
$test$;
reset role;

rollback;
