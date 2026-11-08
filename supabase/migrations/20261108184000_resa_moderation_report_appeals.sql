begin;

create table if not exists public.resa_moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.resa_moderation_reports(id) on delete cascade,
  appellant_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  details text check (details is null or char_length(details) <= 5000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'upheld', 'overturned')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint resa_moderation_appeals_one_per_report unique (report_id, appellant_id)
);

create index if not exists resa_moderation_appeals_status_created_idx
  on public.resa_moderation_appeals (status, created_at asc);
create index if not exists resa_moderation_appeals_appellant_created_idx
  on public.resa_moderation_appeals (appellant_id, created_at desc);

alter table public.resa_moderation_appeals enable row level security;
revoke all on public.resa_moderation_appeals from anon;
grant select, insert, update on public.resa_moderation_appeals to authenticated;

drop policy if exists resa_appeals_read on public.resa_moderation_appeals;
create policy resa_appeals_read on public.resa_moderation_appeals
for select to authenticated
using (
  appellant_id = (select auth.uid())
  or private.is_verified_zion_global_admin()
  or exists (
    select 1
    from public.resa_moderation_reports r
    where r.id = report_id
      and r.organization_id is not null
      and private.has_org_permission(r.organization_id, 'resa.moderate')
  )
);

drop policy if exists resa_appeals_insert on public.resa_moderation_appeals;
create policy resa_appeals_insert on public.resa_moderation_appeals
for insert to authenticated
with check (
  appellant_id = (select auth.uid())
  and exists (
    select 1
    from public.resa_moderation_reports r
    where r.id = report_id
      and r.reporter_id = (select auth.uid())
      and r.status in ('resolved', 'dismissed')
  )
);

drop policy if exists resa_appeals_moderator_update on public.resa_moderation_appeals;
create policy resa_appeals_moderator_update on public.resa_moderation_appeals
for update to authenticated
using (
  private.is_verified_zion_global_admin()
  or exists (
    select 1
    from public.resa_moderation_reports r
    where r.id = report_id
      and r.organization_id is not null
      and private.has_org_permission(r.organization_id, 'resa.moderate')
  )
)
with check (
  (private.is_verified_zion_global_admin()
   or exists (
     select 1
     from public.resa_moderation_reports r
     where r.id = report_id
       and r.organization_id is not null
       and private.has_org_permission(r.organization_id, 'resa.moderate')
   ))
  and reviewed_by = (select auth.uid())
  and exists (
    select 1
    from public.resa_moderation_reports r
    where r.id = report_id
      and r.reviewed_by is distinct from (select auth.uid())
  )
);

create or replace function private.resa_guard_moderation_appeal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_report public.resa_moderation_reports%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into v_report
    from public.resa_moderation_reports
    where id = new.report_id
      and reporter_id = new.appellant_id
      and status in ('resolved', 'dismissed');
    if not found then
      raise exception 'Only the original reporter may appeal a final report decision';
    end if;
    return new;
  end if;

  if new.report_id is distinct from old.report_id
     or new.appellant_id is distinct from old.appellant_id
     or new.reason is distinct from old.reason
     or new.details is distinct from old.details
     or new.created_at is distinct from old.created_at then
    raise exception 'Appeal identity and submission are immutable';
  end if;

  select * into v_report
  from public.resa_moderation_reports
  where id = old.report_id;

  if not found or v_report.reviewed_by is not distinct from new.reviewed_by then
    raise exception 'Appeals must be reviewed by a different moderator';
  end if;

  if new.status in ('upheld', 'overturned')
     and (nullif(btrim(new.decision_note), '') is null or new.reviewed_at is null) then
    raise exception 'A final appeal decision requires a note and review timestamp';
  end if;

  if old.status in ('upheld', 'overturned') then
    raise exception 'A final appeal decision cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists resa_guard_moderation_appeal on public.resa_moderation_appeals;
create trigger resa_guard_moderation_appeal
before insert or update on public.resa_moderation_appeals
for each row execute function private.resa_guard_moderation_appeal();

revoke all on function private.resa_guard_moderation_appeal() from public, anon, authenticated;

commit;
