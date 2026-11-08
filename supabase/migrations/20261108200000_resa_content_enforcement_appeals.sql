begin;

alter table public.resa_contents
  add column if not exists moderation_status text not null default 'active'
  check (moderation_status in ('active','removed'));

create or replace function private.resa_guard_content_moderation_status()
returns trigger
language plpgsql
set search_path = ''
as $guard$
begin
  if new.moderation_status is distinct from old.moderation_status
     and not private.is_verified_zion_global_admin()
     and not (old.organization_id is not null and private.has_org_permission(old.organization_id,'resa.moderate')) then
    raise exception 'Only authorized moderation may change content moderation status';
  end if;
  return new;
end;
$guard$;

drop trigger if exists resa_guard_content_moderation_status on public.resa_contents;
create trigger resa_guard_content_moderation_status
before update of moderation_status on public.resa_contents
for each row execute function private.resa_guard_content_moderation_status();

revoke all on function private.resa_guard_content_moderation_status() from public, anon, authenticated;

create table if not exists public.resa_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('content_removed','formal_warning')),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  duration_hours integer check (duration_hours is null or duration_hours between 1 and 8760),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  revocation_note text check (revocation_note is null or char_length(revocation_note) <= 2000)
);

create index if not exists resa_moderation_actions_target_created_idx
  on public.resa_moderation_actions(target_user_id, created_at desc);
create index if not exists resa_moderation_actions_content_status_idx
  on public.resa_moderation_actions(content_id, status);

create table if not exists public.resa_content_moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.resa_moderation_actions(id) on delete cascade,
  appellant_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  details text check (details is null or char_length(details) <= 5000),
  status text not null default 'open' check (status in ('open','reviewing','upheld','overturned')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists resa_content_moderation_appeals_status_created_idx
  on public.resa_content_moderation_appeals(status, created_at asc);

alter table public.resa_moderation_actions enable row level security;
alter table public.resa_content_moderation_appeals enable row level security;
revoke all on public.resa_moderation_actions, public.resa_content_moderation_appeals from anon;
grant select on public.resa_moderation_actions, public.resa_content_moderation_appeals to authenticated;
grant insert on public.resa_content_moderation_appeals to authenticated;

drop policy if exists resa_moderation_actions_read on public.resa_moderation_actions;
create policy resa_moderation_actions_read on public.resa_moderation_actions
for select to authenticated
using (
  target_user_id = (select auth.uid())
  or private.is_verified_zion_global_admin()
  or exists (
    select 1 from public.resa_contents c
    where c.id = content_id and c.organization_id is not null
      and private.has_org_permission(c.organization_id, 'resa.moderate')
  )
);

drop policy if exists resa_content_appeals_read on public.resa_content_moderation_appeals;
create policy resa_content_appeals_read on public.resa_content_moderation_appeals
for select to authenticated
using (
  appellant_id = (select auth.uid())
  or private.is_verified_zion_global_admin()
  or exists (
    select 1 from public.resa_moderation_actions a
    join public.resa_contents c on c.id = a.content_id
    where a.id = action_id and c.organization_id is not null
      and private.has_org_permission(c.organization_id, 'resa.moderate')
  )
);

drop policy if exists resa_content_appeals_insert on public.resa_content_moderation_appeals;
create policy resa_content_appeals_insert on public.resa_content_moderation_appeals
for insert to authenticated
with check (
  appellant_id = (select auth.uid())
  and exists (
    select 1 from public.resa_moderation_actions a
    where a.id = action_id and a.target_user_id = (select auth.uid())
      and a.action_type = 'content_removed' and a.status = 'active'
  )
);

create or replace function private.resa_apply_content_moderation_action(
  p_content_id uuid, p_action_type text, p_reason text
) returns public.resa_moderation_actions
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_content public.resa_contents%rowtype;
  v_action public.resa_moderation_actions%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_action_type not in ('content_removed','formal_warning') then raise exception 'Unsupported moderation action'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 10 or char_length(p_reason) > 2000 then raise exception 'A reason between 10 and 2000 characters is required'; end if;

  select * into v_content from public.resa_contents where id = p_content_id for update;
  if not found then raise exception 'Content not found'; end if;
  if not (private.is_verified_zion_global_admin() or
    (v_content.organization_id is not null and private.has_org_permission(v_content.organization_id,'resa.moderate'))) then
    raise exception 'Not authorized to moderate this content';
  end if;
  if v_content.author_id = v_actor then raise exception 'A moderator cannot sanction their own content'; end if;

  if p_action_type = 'content_removed' and v_content.moderation_status = 'removed' then
    raise exception 'Content is already removed';
  end if;

  insert into public.resa_moderation_actions(content_id,target_user_id,action_type,reason,created_by)
  values(p_content_id,v_content.author_id,p_action_type,btrim(p_reason),v_actor)
  returning * into v_action;

  if p_action_type = 'content_removed' then
    update public.resa_contents set moderation_status='removed', updated_at=now() where id=p_content_id;
  end if;
  insert into public.notifications(user_id,type,title,body,channel,priority,data)
  values(v_content.author_id,'resa.moderation.action',
    case when p_action_type='content_removed' then 'Publicação removida' else 'Advertência formal' end,
    case when p_action_type='content_removed' then 'Uma publicação tua foi removida. Consulta as medidas aplicadas à tua conta para veres a fundamentação e, se necessário, apresentares recurso.' else 'Recebeste uma advertência formal da equipa de moderação. Consulta o histórico de medidas para veres a fundamentação.' end,
    'in_app','high',jsonb_build_object('action_id',v_action.id,'content_id',p_content_id));
  return v_action;
end;
$$;

create or replace function private.resa_decide_content_moderation_appeal(
  p_appeal_id uuid, p_status text, p_decision_note text
) returns public.resa_content_moderation_appeals
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_appeal public.resa_content_moderation_appeals%rowtype;
  v_action public.resa_moderation_actions%rowtype;
  v_content public.resa_contents%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_status not in ('reviewing','upheld','overturned') then raise exception 'Invalid appeal status'; end if;
  if p_status in ('upheld','overturned') and (nullif(btrim(p_decision_note),'') is null or char_length(p_decision_note)>2000) then raise exception 'A reasoned final decision is required'; end if;

  select * into v_appeal from public.resa_content_moderation_appeals where id=p_appeal_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  select * into v_action from public.resa_moderation_actions where id=v_appeal.action_id for update;
  select * into v_content from public.resa_contents where id=v_action.content_id for update;

  if not (private.is_verified_zion_global_admin() or
    (v_content.organization_id is not null and private.has_org_permission(v_content.organization_id,'resa.moderate'))) then
    raise exception 'Not authorized to review this appeal';
  end if;
  if v_action.created_by = v_actor then raise exception 'The original moderator cannot review this appeal'; end if;
  if v_appeal.status in ('upheld','overturned') then raise exception 'This appeal is already final'; end if;

  update public.resa_content_moderation_appeals
    set status=p_status, reviewed_by=v_actor, reviewed_at=now(),
        decision_note=case when p_status='reviewing' then null else btrim(p_decision_note) end
    where id=p_appeal_id returning * into v_appeal;

  if p_status='overturned' then
    update public.resa_moderation_actions
      set status='revoked', revoked_by=v_actor, revoked_at=now(),
          revocation_note=btrim(p_decision_note)
      where id=v_action.id;
    if v_action.action_type='content_removed' then
      update public.resa_contents set moderation_status='active', updated_at=now()
      where id=v_content.id
        and not exists (
          select 1 from public.resa_moderation_actions a
          where a.content_id=v_content.id and a.action_type='content_removed'
            and a.status='active' and a.id<>v_action.id
        );
    end if;
  end if;
  insert into public.notifications(user_id,type,title,body,channel,priority,data)
  values(v_appeal.appellant_id,'resa.moderation.appeal',
    case when p_status='overturned' then 'Recurso aceite' else case when p_status='upheld' then 'Recurso concluído' else 'Recurso em análise' end end,
    case when p_status='overturned' then 'A revisão independente anulou a medida. A publicação foi restaurada.' else case when p_status='upheld' then 'A revisão independente manteve a medida aplicada. Consulta a fundamentação no teu histórico.' else 'O teu recurso foi atribuído para análise independente.' end end,
    'in_app','high',jsonb_build_object('appeal_id',v_appeal.id,'action_id',v_action.id));
  return v_appeal;
end;
$$;

revoke all on function private.resa_apply_content_moderation_action(uuid,text,text) from public, anon;
revoke all on function private.resa_decide_content_moderation_appeal(uuid,text,text) from public, anon;
grant execute on function private.resa_apply_content_moderation_action(uuid,text,text) to authenticated;
grant execute on function private.resa_decide_content_moderation_appeal(uuid,text,text) to authenticated;

-- Removed content is hidden from every audience except its author and global moderators.
drop policy if exists resa_contents_audience_read on public.resa_contents;
create policy resa_contents_audience_read on public.resa_contents
for select to authenticated
using (
  (private.resa_can_view_content(author_id, visibility, community_id, organization_id)
   and not private.resa_is_blocked_by_or_blocking(author_id)
   and (moderation_status='active' or author_id=(select auth.uid()) or private.is_verified_zion_global_admin()))
);

commit;
