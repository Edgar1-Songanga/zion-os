begin;
do $$
declare
  actor uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  origin_org uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  destination_org uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  source_id uuid;
  identity_id uuid;
  transfer_id uuid;
  destination_count integer;
begin
  insert into auth.users(id) values (actor);
  insert into public.organizations(id,name) values
    (origin_org,'Origin Church'),
    (destination_org,'Destination Church');

  insert into public.church_member_records (
    organization_id, first_name, last_name, birth_date, gender, phone, created_by
  ) values (
    origin_org, 'Ana', 'Silva', date '1990-05-12', 'FEMALE', '+244900000000', actor
  ) returning id, person_identity_id into source_id, identity_id;

  if identity_id is null then
    raise exception 'New member did not receive a global person identity';
  end if;

  insert into public.church_member_transfers (
    member_record_id, origin_organization_id, destination_organization_id,
    status, request_date, requested_by
  ) values (
    source_id, origin_org, destination_org, 'DRAFT', current_date, actor
  ) returning id into transfer_id;

  update public.church_member_transfers
     set status = 'ACCEPTED', decided_by = actor, decided_at = now()
   where id = transfer_id;

  select count(*) into destination_count
    from public.church_member_records
   where organization_id = destination_org
     and person_identity_id = identity_id
     and membership_status = 'ACTIVE';

  if destination_count <> 1 then
    raise exception 'Accepted transfer did not create exactly one destination membership';
  end if;

  if not exists (
    select 1 from public.church_member_records
     where id = source_id and membership_status = 'TRANSFERRED'
  ) then
    raise exception 'Origin membership was not marked TRANSFERRED';
  end if;

  if (select count(*) from public.church_member_records where person_identity_id = identity_id) <> 2 then
    raise exception 'Transfer created a new identity instead of reusing the original identity';
  end if;

  begin
    insert into public.church_member_records (
      organization_id, person_identity_id, first_name, last_name
    ) values (
      destination_org, identity_id, 'Ana', 'Silva'
    );
    raise exception 'Duplicate identity membership in destination was not blocked';
  exception when unique_violation then
    null;
  end;
end $$;
rollback;
