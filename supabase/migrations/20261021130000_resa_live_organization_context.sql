-- Link RESA Live sessions to real ZION organizations, departments and ministries.
-- Existing sessions remain unchanged and public lives keep their current behavior.
alter table public.resa_live_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists organization_unit_id uuid references public.organization_units(id) on delete set null,
  add column if not exists ministry_id uuid references public.ministries(id) on delete set null;

create index if not exists resa_live_org_status_idx
  on public.resa_live_sessions (organization_id, status, scheduled_at)
  where organization_id is not null;
create index if not exists resa_live_unit_idx
  on public.resa_live_sessions (organization_unit_id)
  where organization_unit_id is not null;
create index if not exists resa_live_ministry_idx
  on public.resa_live_sessions (ministry_id)
  where ministry_id is not null;

create or replace function private.resa_validate_live_context()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  unit_org uuid;
  ministry_org uuid;
begin
  if new.visibility = 'organization' and new.organization_id is null then
    raise exception 'Organization visibility requires organization_id' using errcode = '23514';
  end if;

  if new.organization_unit_id is not null then
    select u.organization_id into unit_org
    from public.organization_units u
    where u.id = new.organization_unit_id and u.is_active = true;
    if unit_org is null or unit_org is distinct from new.organization_id then
      raise exception 'Department must belong to the selected organization' using errcode = '23514';
    end if;
  end if;

  if new.ministry_id is not null then
    select m.organization_id into ministry_org
    from public.ministries m
    where m.id = new.ministry_id and m.status = 'ACTIVE';
    if ministry_org is null or ministry_org is distinct from new.organization_id then
      raise exception 'Ministry must belong to the selected organization' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_resa_live_validate_context on public.resa_live_sessions;
create trigger trg_resa_live_validate_context
before insert or update of visibility, organization_id, organization_unit_id, ministry_id
on public.resa_live_sessions
for each row execute function private.resa_validate_live_context();

drop policy if exists resa_live_public_read on public.resa_live_sessions;
create policy resa_live_public_read on public.resa_live_sessions
for select to authenticated
using (
  visibility = 'public'
  or host_id = (select auth.uid())
  or (
    visibility = 'organization'
    and organization_id is not null
    and private.is_org_member(organization_id)
  )
);

drop policy if exists resa_live_host_insert on public.resa_live_sessions;
create policy resa_live_host_insert on public.resa_live_sessions
for insert to authenticated
with check (
  host_id = (select auth.uid())
  and (
    organization_id is null
    or private.is_org_member(organization_id)
  )
);

drop policy if exists resa_live_host_update on public.resa_live_sessions;
create policy resa_live_host_update on public.resa_live_sessions
for update to authenticated
using (host_id = (select auth.uid()))
with check (
  host_id = (select auth.uid())
  and (
    organization_id is null
    or private.is_org_member(organization_id)
  )
);

-- Members of the same organization can read and write chat only while its
-- organization-scoped live is actually broadcasting. Public chat stays intact.
drop policy if exists resa_live_chat_read_active on public.resa_live_chat_messages;
create policy resa_live_chat_read_active
on public.resa_live_chat_messages for select to authenticated
using (
  sender_id = (select auth.uid())
  or exists (
    select 1
    from public.resa_live_sessions live
    where live.id = live_id
      and live.status = 'live'
      and (
        live.visibility = 'public'
        or live.host_id = (select auth.uid())
        or (
          live.visibility = 'organization'
          and live.organization_id is not null
          and private.is_org_member(live.organization_id)
        )
      )
  )
);

drop policy if exists resa_live_chat_insert_active on public.resa_live_chat_messages;
create policy resa_live_chat_insert_active
on public.resa_live_chat_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.resa_live_sessions live
    where live.id = live_id
      and live.status = 'live'
      and (
        live.visibility = 'public'
        or live.host_id = (select auth.uid())
        or (
          live.visibility = 'organization'
          and live.organization_id is not null
          and private.is_org_member(live.organization_id)
        )
      )
  )
);
