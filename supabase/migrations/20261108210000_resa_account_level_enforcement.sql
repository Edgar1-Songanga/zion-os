begin;

create table if not exists public.resa_account_sanctions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  restriction_type text not null check (restriction_type in ('publishing','interaction','account')),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  revocation_note text check (revocation_note is null or char_length(revocation_note)<=2000),
  check (expires_at is null or expires_at > created_at)
);
create index if not exists resa_account_sanctions_active_target_idx
  on public.resa_account_sanctions(target_user_id,restriction_type,expires_at)
  where status='active';

create table if not exists public.resa_account_sanction_appeals (
  id uuid primary key default gen_random_uuid(),
  sanction_id uuid not null unique references public.resa_account_sanctions(id) on delete cascade,
  appellant_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  details text check (details is null or char_length(details)<=5000),
  status text not null default 'open' check (status in ('open','reviewing','upheld','overturned')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note)<=2000),
  created_at timestamptz not null default now()
);
create index if not exists resa_account_sanction_appeals_status_created_idx
  on public.resa_account_sanction_appeals(status,created_at);

alter table public.resa_account_sanctions enable row level security;
alter table public.resa_account_sanction_appeals enable row level security;
revoke all on public.resa_account_sanctions,public.resa_account_sanction_appeals from anon,authenticated;
grant select on public.resa_account_sanctions,public.resa_account_sanction_appeals to authenticated;
grant insert on public.resa_account_sanction_appeals to authenticated;

drop policy if exists resa_account_sanctions_read on public.resa_account_sanctions;
create policy resa_account_sanctions_read on public.resa_account_sanctions
for select to authenticated
using (target_user_id=(select auth.uid()) or private.is_verified_zion_global_admin());

drop policy if exists resa_account_sanction_appeals_read on public.resa_account_sanction_appeals;
create policy resa_account_sanction_appeals_read on public.resa_account_sanction_appeals
for select to authenticated
using (appellant_id=(select auth.uid()) or private.is_verified_zion_global_admin());

drop policy if exists resa_account_sanction_appeals_insert on public.resa_account_sanction_appeals;
create policy resa_account_sanction_appeals_insert on public.resa_account_sanction_appeals
for insert to authenticated
with check (
  appellant_id=(select auth.uid())
  and exists (
    select 1 from public.resa_account_sanctions s
    where s.id=sanction_id and s.target_user_id=(select auth.uid())
      and s.status='active' and (s.expires_at is null or s.expires_at>now())
  )
);

create or replace function private.resa_assert_account_action(p_user_id uuid,p_action text)
returns void
language plpgsql
security definer
set search_path=''
as $fn$
declare v_restriction text;
begin
  if p_user_id is null then raise exception 'Authenticated actor is required'; end if;
  if p_action not in ('publishing','interaction') then raise exception 'Invalid RESA action'; end if;
  if exists (
    select 1 from public.resa_account_sanctions s
    where s.target_user_id=p_user_id and s.status='active'
      and (s.expires_at is null or s.expires_at>now())
      and s.restriction_type='account'
  ) then
    raise exception 'RESA_ACCOUNT_SUSPENDED' using errcode='42501';
  end if;
  if exists (
    select 1 from public.resa_account_sanctions s
    where s.target_user_id=p_user_id and s.status='active'
      and (s.expires_at is null or s.expires_at>now())
      and s.restriction_type=p_action
  ) then
    v_restriction:=p_action;
    raise exception 'RESA_ACTION_RESTRICTED:%',v_restriction using errcode='42501';
  end if;
end;
$fn$;

create or replace function private.resa_enforce_account_action()
returns trigger
language plpgsql
security definer
set search_path=''
as $trigger$
declare v_actor uuid; v_action text:=tg_argv[0];
begin
  v_actor:=auth.uid();
  perform private.resa_assert_account_action(v_actor,v_action);
  return new;
end;
$trigger$;

revoke all on function private.resa_assert_account_action(uuid,text) from public,anon,authenticated;
revoke all on function private.resa_enforce_account_action() from public,anon,authenticated;

drop trigger if exists resa_account_guard_contents on public.resa_contents;
create trigger resa_account_guard_contents before insert or update on public.resa_contents
for each row execute function private.resa_enforce_account_action('publishing');

drop trigger if exists resa_account_guard_comments on public.resa_comments;
create trigger resa_account_guard_comments before insert or update on public.resa_comments
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_reactions on public.resa_reactions;
create trigger resa_account_guard_reactions before insert or update on public.resa_reactions
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_follows on public.resa_follows;
create trigger resa_account_guard_follows before insert or update on public.resa_follows
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_shares on public.resa_shares;
create trigger resa_account_guard_shares before insert or update on public.resa_shares
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_messages on public.resa_messages;
create trigger resa_account_guard_messages before insert or update on public.resa_messages
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_communities on public.resa_communities;
create trigger resa_account_guard_communities before insert or update on public.resa_communities
for each row execute function private.resa_enforce_account_action('publishing');

drop trigger if exists resa_account_guard_community_members on public.resa_community_members;
create trigger resa_account_guard_community_members before insert on public.resa_community_members
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_events on public.resa_events;
create trigger resa_account_guard_events before insert on public.resa_events
for each row execute function private.resa_enforce_account_action('publishing');

drop trigger if exists resa_account_guard_event_participants on public.resa_event_participants;
create trigger resa_account_guard_event_participants before insert on public.resa_event_participants
for each row execute function private.resa_enforce_account_action('interaction');

-- Messaging, voice/video calls and live participation are interaction surfaces too.
drop trigger if exists resa_account_guard_conversation_members on public.resa_conversation_members;
create trigger resa_account_guard_conversation_members before insert on public.resa_conversation_members
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_calls on public.resa_calls;
create trigger resa_account_guard_calls before insert on public.resa_calls
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_call_participants on public.resa_call_participants;
create trigger resa_account_guard_call_participants before insert on public.resa_call_participants
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_call_signals on public.resa_call_signals;
create trigger resa_account_guard_call_signals before insert on public.resa_call_signals
for each row execute function private.resa_enforce_account_action('interaction');

drop trigger if exists resa_account_guard_live_sessions on public.resa_live_sessions;
create trigger resa_account_guard_live_sessions before insert on public.resa_live_sessions
for each row execute function private.resa_enforce_account_action('publishing');

drop trigger if exists resa_account_guard_live_access_grants on public.resa_live_access_grants;
create trigger resa_account_guard_live_access_grants before insert on public.resa_live_access_grants
for each row execute function private.resa_enforce_account_action('interaction');

create or replace function private.resa_admin_create_account_sanction(
  p_target_user_id uuid,p_restriction_type text,p_reason text,p_expires_at timestamptz default null
) returns public.resa_account_sanctions
language plpgsql
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid(); v_result public.resa_account_sanctions%rowtype;
begin
  if v_actor is null or not private.is_verified_zion_global_admin() then raise exception 'Verified global administrator required'; end if;
  if p_target_user_id is null or p_target_user_id=v_actor then raise exception 'Invalid sanction target'; end if;
  if p_restriction_type not in ('publishing','interaction','account') then raise exception 'Invalid restriction type'; end if;
  if char_length(btrim(coalesce(p_reason,'')))<10 or char_length(p_reason)>2000 then raise exception 'A reason between 10 and 2000 characters is required'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expiration must be in the future'; end if;
  if not exists(select 1 from auth.users where id=p_target_user_id) then raise exception 'Target account not found'; end if;
  insert into public.resa_account_sanctions(target_user_id,restriction_type,reason,expires_at,created_by)
  values(p_target_user_id,p_restriction_type,btrim(p_reason),p_expires_at,v_actor)
  returning * into v_result;
  insert into public.notifications(user_id,type,title,body,channel,priority,data)
  values(p_target_user_id,'resa.account.restriction','Restrição aplicada',
    'Foi aplicada uma restrição à tua conta RESA. Consulta o histórico de medidas para veres a fundamentação e, se necessário, apresentares recurso.',
    'in_app','high',jsonb_build_object('sanction_id',v_result.id,'restriction_type',p_restriction_type,'expires_at',p_expires_at));
  return v_result;
end;
$fn$;

create or replace function private.resa_admin_revoke_account_sanction(
  p_sanction_id uuid,p_note text
) returns public.resa_account_sanctions
language plpgsql
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid(); v_result public.resa_account_sanctions%rowtype;
begin
  if v_actor is null or not private.is_verified_zion_global_admin() then raise exception 'Verified global administrator required'; end if;
  if char_length(btrim(coalesce(p_note,'')))<10 or char_length(p_note)>2000 then raise exception 'A reasoned revocation note is required'; end if;
  update public.resa_account_sanctions set status='revoked',revoked_by=v_actor,revoked_at=now(),revocation_note=btrim(p_note)
  where id=p_sanction_id and status='active' returning * into v_result;
  if v_result.id is null then raise exception 'Active sanction not found'; end if;
  return v_result;
end;
$fn$;

create or replace function private.resa_submit_account_sanction_appeal(
  p_sanction_id uuid,p_reason text,p_details text default null
) returns public.resa_account_sanction_appeals
language plpgsql
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid(); v_sanction public.resa_account_sanctions%rowtype; v_result public.resa_account_sanction_appeals%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_reason,'')))<10 or char_length(p_reason)>2000 then raise exception 'Appeal reason must contain 10 to 2000 characters'; end if;
  if char_length(coalesce(p_details,''))>5000 then raise exception 'Appeal details exceed 5000 characters'; end if;
  select * into v_sanction from public.resa_account_sanctions where id=p_sanction_id and target_user_id=v_actor for update;
  if not found or v_sanction.status<>'active' or (v_sanction.expires_at is not null and v_sanction.expires_at<=now()) then raise exception 'Active sanction not found'; end if;
  insert into public.resa_account_sanction_appeals(sanction_id,appellant_id,reason,details)
  values(p_sanction_id,v_actor,btrim(p_reason),nullif(btrim(coalesce(p_details,'')),''))
  returning * into v_result;
  return v_result;
end;
$fn$;

create or replace function private.resa_admin_decide_account_sanction_appeal(
  p_appeal_id uuid,p_status text,p_decision_note text
) returns public.resa_account_sanction_appeals
language plpgsql
security definer
set search_path=''
as $fn$
declare v_actor uuid:=auth.uid(); v_appeal public.resa_account_sanction_appeals%rowtype; v_sanction public.resa_account_sanctions%rowtype;
begin
  if v_actor is null or not private.is_verified_zion_global_admin() then raise exception 'Verified global administrator required'; end if;
  if p_status not in ('reviewing','upheld','overturned') then raise exception 'Invalid appeal status'; end if;
  if p_status in ('upheld','overturned') and (nullif(btrim(p_decision_note),'') is null or char_length(p_decision_note)>2000) then raise exception 'A reasoned final decision is required'; end if;
  select * into v_appeal from public.resa_account_sanction_appeals where id=p_appeal_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  select * into v_sanction from public.resa_account_sanctions where id=v_appeal.sanction_id for update;
  if v_sanction.created_by=v_actor then raise exception 'The original sanctioning moderator cannot review this appeal'; end if;
  if v_appeal.status in ('upheld','overturned') then raise exception 'Appeal already has a final decision'; end if;
  update public.resa_account_sanction_appeals set status=p_status,reviewed_by=v_actor,reviewed_at=now(),
    decision_note=case when p_status='reviewing' then null else btrim(p_decision_note) end
    where id=p_appeal_id returning * into v_appeal;
  if p_status='overturned' then
    update public.resa_account_sanctions set status='revoked',revoked_by=v_actor,revoked_at=now(),
      revocation_note=btrim(p_decision_note) where id=v_sanction.id and status='active';
  end if;
  insert into public.notifications(user_id,type,title,body,channel,priority,data)
  values(v_appeal.appellant_id,'resa.account.appeal',
    case when p_status='overturned' then 'Recurso aceite' when p_status='upheld' then 'Recurso concluído' else 'Recurso em análise' end,
    case when p_status='overturned' then 'A revisão independente anulou a restrição da tua conta.' when p_status='upheld' then 'A revisão independente manteve a restrição da tua conta.' else 'O teu recurso foi atribuído para análise independente.' end,
    'in_app','high',jsonb_build_object('appeal_id',v_appeal.id,'sanction_id',v_sanction.id));
  return v_appeal;
end;
$fn$;

revoke all on function private.resa_admin_create_account_sanction(uuid,text,text,timestamptz) from public,anon;
revoke all on function private.resa_admin_revoke_account_sanction(uuid,text) from public,anon;
revoke all on function private.resa_submit_account_sanction_appeal(uuid,text,text) from public,anon;
revoke all on function private.resa_admin_decide_account_sanction_appeal(uuid,text,text) from public,anon;
grant execute on function private.resa_admin_create_account_sanction(uuid,text,text,timestamptz) to authenticated;
grant execute on function private.resa_admin_revoke_account_sanction(uuid,text) to authenticated;
grant execute on function private.resa_submit_account_sanction_appeal(uuid,text,text) to authenticated;
grant execute on function private.resa_admin_decide_account_sanction_appeal(uuid,text,text) to authenticated;

commit;
