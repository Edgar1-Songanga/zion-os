insert into public.organizations (id, name, organization_type, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'Igreja Central', 'LOCAL_CHURCH', true);

insert into public.ministries (id, organization_id, name)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Escola Sabatina');

insert into public.sabbath_school_classes (
  id, organization_id, ministry_id, name, meeting_day, meeting_time, room_label, is_public, is_active
) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Jovens Adultos', 6, '09:00', 'Sala 2', true, true
);

insert into public.youth_club_activities (
  id, organization_id, title, description, starts_at, ends_at, location, activity_type, status, is_public
) values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Acampamento JA', 'Fim de semana de serviço e comunhão',
  '2026-12-12T08:00:00Z', '2026-12-13T16:00:00Z',
  'Bengo', 'camp', 'PLANNED', true
);

do $$
begin
  if (select count(*) from public.resa_institutional_publications where is_active) <> 2 then
    raise exception 'Expected exactly two public institutional projections after source inserts';
  end if;
  if not exists (
    select 1 from public.resa_institutional_publications
     where source_type = 'SABBATH_SCHOOL_CLASS'
       and title = 'Jovens Adultos'
       and organization_name = 'Igreja Central'
       and ministry_name = 'Escola Sabatina'
       and meeting_day = 6
       and room_label = 'Sala 2'
  ) then
    raise exception 'Sabbath School public projection is incomplete';
  end if;
  if not exists (
    select 1 from public.resa_institutional_publications
     where source_type = 'YOUTH_ACTIVITY'
       and title = 'Acampamento JA'
       and body = 'Fim de semana de serviço e comunhão'
       and location = 'Bengo'
  ) then
    raise exception 'Youth activity public projection is incomplete';
  end if;
end;
$$;

-- Updates are reflected without changing the original publication timestamp.
create temporary table publication_timestamp as
select published_at from public.resa_institutional_publications
where source_type = 'YOUTH_ACTIVITY'
  and source_id = '40000000-0000-4000-8000-000000000001';

update public.youth_club_activities
   set title = 'Acampamento JA 2026', description = 'Descrição atualizada'
 where id = '40000000-0000-4000-8000-000000000001';

do $$
begin
  if not exists (
    select 1 from public.resa_institutional_publications p
    join publication_timestamp t on t.published_at = p.published_at
    where p.source_type = 'YOUTH_ACTIVITY'
      and p.source_id = '40000000-0000-4000-8000-000000000001'
      and p.title = 'Acampamento JA 2026'
      and p.body = 'Descrição atualizada'
  ) then
    raise exception 'Youth source updates were not synchronized or publication timestamp changed';
  end if;
end;
$$;

-- Organization changes update attribution and immediately control public visibility.
update public.organizations
   set name = 'Igreja Central Renovada', is_active = false
 where id = '10000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.resa_institutional_publications where is_active) then
    raise exception 'Inactive organization publications must not remain public';
  end if;
  if exists (
    select 1 from public.resa_institutional_publications
     where organization_name <> 'Igreja Central Renovada'
  ) then
    raise exception 'Organization attribution was not refreshed';
  end if;
end;
$$;

update public.organizations
   set is_active = true
 where id = '10000000-0000-4000-8000-000000000001';

-- Unpublishing and source deletion remove the projection.
update public.youth_club_activities
   set is_public = false
 where id = '40000000-0000-4000-8000-000000000001';

delete from public.sabbath_school_classes
 where id = '30000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.resa_institutional_publications) then
    raise exception 'Unpublished or deleted source records must be removed from RESA projection';
  end if;
end;
$$;

-- The authenticated role can read only active rows and cannot mutate the projection.
insert into public.sabbath_school_classes (
  id, organization_id, ministry_id, name, meeting_day, meeting_time, is_public, is_active
) values (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Classe pública', 6, '10:00', true, true
);

set role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', false);

do $$
begin
  if (select count(*) from public.resa_institutional_publications) <> 1 then
    raise exception 'Authenticated community members should see active public institutional publications';
  end if;

  begin
    insert into public.resa_institutional_publications (
      source_type, source_id, organization_id, organization_name, organization_type, title
    ) values (
      'YOUTH_ACTIVITY',
      '40000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      'Fake organization',
      'LOCAL_CHURCH',
      'Unauthorized projection'
    );
    raise exception 'Authenticated users must not be able to write to the projection table';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
