create table public.ministries (
  id uuid not null,
  organization_id uuid not null,
  name text not null,
  constraint ministries_id_organization_id_unique unique (id, organization_id)
);

create unique index ministries_id_org_unique
  on public.ministries (id, organization_id);

create table public.sabbath_school_classes (
  id uuid primary key,
  ministry_id uuid not null,
  organization_id uuid not null,
  constraint sabbath_school_classes_ministry_org_fk
    foreign key (ministry_id, organization_id)
    references public.ministries (id, organization_id)
);

create table public.youth_clubs (
  id uuid primary key,
  ministry_id uuid not null,
  organization_id uuid not null,
  constraint youth_clubs_ministry_org_fk
    foreign key (ministry_id, organization_id)
    references public.ministries (id, organization_id)
);
