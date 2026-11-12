-- Secretariat offline synchronization: atomic idempotency + optimistic concurrency.
-- Uses the caller's JWT and existing church.members.manage RLS permission.
begin;

alter table public.church_member_records
  add column if not exists row_version bigint not null default 1;

create or replace function public.touch_church_member_row_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.row_version := old.row_version + 1;
  return new;
end;
$$;

drop trigger if exists church_member_row_version_touch on public.church_member_records;
create trigger church_member_row_version_touch
before update on public.church_member_records
for each row execute function public.touch_church_member_row_version();

create table if not exists public.zion_offline_operation_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  entity_id uuid not null,
  module_key text not null,
  action text not null check (action in ('create', 'update')),
  result jsonb,
  created_at timestamptz not null default now(),
  constraint zion_offline_operation_receipts_actor_org_operation_uq
    unique (actor_id, organization_id, operation_id)
);

alter table public.zion_offline_operation_receipts enable row level security;
revoke all on public.zion_offline_operation_receipts from anon;
grant select, insert, update on public.zion_offline_operation_receipts to authenticated;

drop policy if exists zion_offline_receipts_actor_read on public.zion_offline_operation_receipts;
create policy zion_offline_receipts_actor_read
on public.zion_offline_operation_receipts
for select to authenticated
using (
  actor_id = (select auth.uid())
  and private.has_org_permission(organization_id, 'church.members.manage')
);

drop policy if exists zion_offline_receipts_actor_insert on public.zion_offline_operation_receipts;
create policy zion_offline_receipts_actor_insert
on public.zion_offline_operation_receipts
for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and private.has_org_permission(organization_id, 'church.members.manage')
);

drop policy if exists zion_offline_receipts_actor_update on public.zion_offline_operation_receipts;
create policy zion_offline_receipts_actor_update
on public.zion_offline_operation_receipts
for update to authenticated
using (
  actor_id = (select auth.uid())
  and private.has_org_permission(organization_id, 'church.members.manage')
)
with check (
  actor_id = (select auth.uid())
  and private.has_org_permission(organization_id, 'church.members.manage')
);

create or replace function public.sync_church_member_offline(
  p_operation_id uuid,
  p_organization_id uuid,
  p_entity_id uuid,
  p_action text,
  p_expected_version bigint,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_receipt public.zion_offline_operation_receipts%rowtype;
  v_member public.church_member_records%rowtype;
  v_existing_version bigint;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_operation_id is null or p_organization_id is null or p_entity_id is null then
    raise exception 'Operation, organization and entity identifiers are required' using errcode = '22023';
  end if;
  if p_action not in ('create', 'update') then
    raise exception 'Unsupported offline member action' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;
  if not private.has_org_permission(p_organization_id, 'church.members.manage') then
    raise exception 'Missing church member management permission' using errcode = '42501';
  end if;

  insert into public.zion_offline_operation_receipts (
    organization_id, actor_id, operation_id, entity_id, module_key, action
  ) values (
    p_organization_id, v_actor, p_operation_id, p_entity_id, 'church.members', p_action
  )
  on conflict (actor_id, organization_id, operation_id) do nothing;

  select * into v_receipt
  from public.zion_offline_operation_receipts
  where actor_id = v_actor
    and organization_id = p_organization_id
    and operation_id = p_operation_id
  for update;

  if v_receipt.entity_id <> p_entity_id
     or v_receipt.module_key <> 'church.members'
     or v_receipt.action <> p_action then
    raise exception 'Idempotency key was already used for a different operation' using errcode = '23505';
  end if;

  if v_receipt.result is not null then
    return v_receipt.result;
  end if;

  if p_action = 'create' then
    if p_expected_version is not null then
      raise exception 'Create operations cannot include an expected version' using errcode = '22023';
    end if;
    if not (p_payload ? 'first_name') or not (p_payload ? 'last_name') then
      raise exception 'First and last name are required' using errcode = '22023';
    end if;

    insert into public.church_member_records (
      id, organization_id, member_number, first_name, last_name, birth_date,
      gender, phone, email, address, baptism_date, membership_status, joined_on,
      notes, created_by, updated_by
    ) values (
      p_entity_id, p_organization_id,
      nullif(p_payload->>'member_number', ''),
      p_payload->>'first_name',
      p_payload->>'last_name',
      nullif(p_payload->>'birth_date', '')::date,
      nullif(p_payload->>'gender', ''),
      nullif(p_payload->>'phone', ''),
      nullif(p_payload->>'email', ''),
      nullif(p_payload->>'address', ''),
      nullif(p_payload->>'baptism_date', '')::date,
      coalesce(nullif(p_payload->>'membership_status', ''), 'ACTIVE'),
      nullif(p_payload->>'joined_on', '')::date,
      nullif(p_payload->>'notes', ''),
      v_actor, v_actor
    )
    returning * into v_member;
  else
    if p_expected_version is null or p_expected_version < 1 then
      raise exception 'Update operations require a positive expected version' using errcode = '22023';
    end if;
    if p_payload = '{}'::jsonb then
      raise exception 'Update payload cannot be empty' using errcode = '22023';
    end if;

    select row_version into v_existing_version
    from public.church_member_records
    where id = p_entity_id and organization_id = p_organization_id;

    if not found then
      raise exception 'Member record not found or not accessible' using errcode = 'P0002';
    end if;

    if v_existing_version <> p_expected_version then
      select * into v_member
      from public.church_member_records
      where id = p_entity_id and organization_id = p_organization_id;
      update public.zion_offline_operation_receipts
      set result = jsonb_build_object(
        'sync_conflict', true,
        'current', to_jsonb(v_member)
      )
      where id = v_receipt.id;
      return jsonb_build_object('sync_conflict', true, 'current', to_jsonb(v_member));
    end if;

    update public.church_member_records m
    set
      member_number = case when p_payload ? 'member_number' then nullif(p_payload->>'member_number', '') else m.member_number end,
      first_name = case when p_payload ? 'first_name' then p_payload->>'first_name' else m.first_name end,
      last_name = case when p_payload ? 'last_name' then p_payload->>'last_name' else m.last_name end,
      birth_date = case when p_payload ? 'birth_date' then nullif(p_payload->>'birth_date', '')::date else m.birth_date end,
      gender = case when p_payload ? 'gender' then nullif(p_payload->>'gender', '') else m.gender end,
      phone = case when p_payload ? 'phone' then nullif(p_payload->>'phone', '') else m.phone end,
      email = case when p_payload ? 'email' then nullif(p_payload->>'email', '') else m.email end,
      address = case when p_payload ? 'address' then nullif(p_payload->>'address', '') else m.address end,
      baptism_date = case when p_payload ? 'baptism_date' then nullif(p_payload->>'baptism_date', '')::date else m.baptism_date end,
      membership_status = case when p_payload ? 'membership_status' then p_payload->>'membership_status' else m.membership_status end,
      joined_on = case when p_payload ? 'joined_on' then nullif(p_payload->>'joined_on', '')::date else m.joined_on end,
      notes = case when p_payload ? 'notes' then nullif(p_payload->>'notes', '') else m.notes end,
      updated_by = v_actor
    where m.id = p_entity_id
      and m.organization_id = p_organization_id
      and m.row_version = p_expected_version
    returning m.* into v_member;

    if not found then
      raise exception 'Member record changed while applying offline update' using errcode = '40001';
    end if;
  end if;

  update public.zion_offline_operation_receipts
  set result = to_jsonb(v_member)
  where id = v_receipt.id;

  return to_jsonb(v_member);
end;
$$;

revoke all on function public.sync_church_member_offline(uuid, uuid, uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.sync_church_member_offline(uuid, uuid, uuid, text, bigint, jsonb) to authenticated;

commit;
