do $$
begin
  if to_regclass('public.ministries_id_org_unique') is not null then
    raise exception 'Redundant ministries index still exists';
  end if;
  if to_regclass('public.ministries_id_organization_id_unique') is null then
    raise exception 'Constraint-backed ministries unique index is missing';
  end if;
end;
$$;

insert into public.ministries (id, organization_id, name)
values (
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'Escola Sabatina'
);

insert into public.sabbath_school_classes (id, ministry_id, organization_id)
values (
  '63000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001'
);

insert into public.youth_clubs (id, ministry_id, organization_id)
values (
  '64000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001'
);

do $$
begin
  if (select count(*) from public.sabbath_school_classes) <> 1
     or (select count(*) from public.youth_clubs) <> 1 then
    raise exception 'Composite foreign keys must remain valid after redundant index removal';
  end if;
end;
$$;
