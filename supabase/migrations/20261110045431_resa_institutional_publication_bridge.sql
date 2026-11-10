begin;

create table if not exists public.resa_institutional_publications (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('SABBATH_SCHOOL_CLASS', 'YOUTH_ACTIVITY')),
  source_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_name text not null,
  organization_type text not null,
  ministry_id uuid,
  ministry_name text,
  title text not null,
  body text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  meeting_day smallint check (meeting_day between 0 and 6),
  meeting_time time,
  room_label text,
  activity_type text,
  status text,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resa_institutional_publications_source_unique unique (source_type, source_id)
);

create index if not exists resa_institutional_publications_feed_idx
  on public.resa_institutional_publications (published_at desc, id desc)
  where is_active = true;

create index if not exists resa_institutional_publications_org_idx
  on public.resa_institutional_publications (organization_id, published_at desc)
  where is_active = true;

alter table public.resa_institutional_publications enable row level security;

drop policy if exists resa_institutional_publications_public_read
  on public.resa_institutional_publications;
create policy resa_institutional_publications_public_read
  on public.resa_institutional_publications
  for select to authenticated
  using (is_active = true);

revoke all on public.resa_institutional_publications from anon, authenticated;
grant select on public.resa_institutional_publications to authenticated;

create or replace function private.sync_resa_sabbath_school_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org record;
begin
  if tg_op = 'DELETE' then
    delete from public.resa_institutional_publications
     where source_type = 'SABBATH_SCHOOL_CLASS' and source_id = old.id;
    return old;
  end if;

  if new.is_public is not true or new.is_active is not true then
    delete from public.resa_institutional_publications
     where source_type = 'SABBATH_SCHOOL_CLASS' and source_id = new.id;
    return new;
  end if;

  select o.name as organization_name,
         o.organization_type,
         o.is_active as organization_active,
         m.name as ministry_name
    into v_org
    from public.organizations o
    left join public.ministries m
      on m.id = new.ministry_id and m.organization_id = new.organization_id
   where o.id = new.organization_id;

  if not found then
    delete from public.resa_institutional_publications
     where source_type = 'SABBATH_SCHOOL_CLASS' and source_id = new.id;
    return new;
  end if;

  insert into public.resa_institutional_publications (
    source_type, source_id, organization_id, organization_name, organization_type,
    ministry_id, ministry_name, title, body, meeting_day, meeting_time, room_label,
    is_active, published_at, updated_at
  ) values (
    'SABBATH_SCHOOL_CLASS', new.id, new.organization_id, v_org.organization_name,
    v_org.organization_type, new.ministry_id, v_org.ministry_name,
    new.name, 'Classe da Escola Sabatina', new.meeting_day, new.meeting_time,
    new.room_label, v_org.organization_active, now(), now()
  )
  on conflict (source_type, source_id) do update set
    organization_id = excluded.organization_id,
    organization_name = excluded.organization_name,
    organization_type = excluded.organization_type,
    ministry_id = excluded.ministry_id,
    ministry_name = excluded.ministry_name,
    title = excluded.title,
    body = excluded.body,
    meeting_day = excluded.meeting_day,
    meeting_time = excluded.meeting_time,
    room_label = excluded.room_label,
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

create or replace function private.sync_resa_youth_activity_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org record;
begin
  if tg_op = 'DELETE' then
    delete from public.resa_institutional_publications
     where source_type = 'YOUTH_ACTIVITY' and source_id = old.id;
    return old;
  end if;

  if new.is_public is not true or new.status = 'CANCELLED' then
    delete from public.resa_institutional_publications
     where source_type = 'YOUTH_ACTIVITY' and source_id = new.id;
    return new;
  end if;

  select o.name as organization_name,
         o.organization_type,
         o.is_active as organization_active
    into v_org
    from public.organizations o
   where o.id = new.organization_id;

  if not found then
    delete from public.resa_institutional_publications
     where source_type = 'YOUTH_ACTIVITY' and source_id = new.id;
    return new;
  end if;

  insert into public.resa_institutional_publications (
    source_type, source_id, organization_id, organization_name, organization_type,
    title, body, starts_at, ends_at, location, activity_type, status,
    is_active, published_at, updated_at
  ) values (
    'YOUTH_ACTIVITY', new.id, new.organization_id, v_org.organization_name,
    v_org.organization_type, new.title, coalesce(new.description, ''),
    new.starts_at, new.ends_at, new.location, new.activity_type, new.status,
    v_org.organization_active, now(), now()
  )
  on conflict (source_type, source_id) do update set
    organization_id = excluded.organization_id,
    organization_name = excluded.organization_name,
    organization_type = excluded.organization_type,
    title = excluded.title,
    body = excluded.body,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    location = excluded.location,
    activity_type = excluded.activity_type,
    status = excluded.status,
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

create or replace function private.refresh_resa_institutional_publication_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.resa_institutional_publications
     set organization_name = new.name,
         organization_type = new.organization_type,
         is_active = new.is_active,
         updated_at = now()
   where organization_id = new.id;
  return new;
end;
$$;

create or replace function private.refresh_resa_institutional_publication_ministry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.resa_institutional_publications
     set ministry_name = new.name,
         updated_at = now()
   where source_type = 'SABBATH_SCHOOL_CLASS'
     and ministry_id = new.id
     and organization_id = new.organization_id;
  return new;
end;
$$;

drop trigger if exists trg_resa_sabbath_school_publication
  on public.sabbath_school_classes;
create trigger trg_resa_sabbath_school_publication
after insert or update of is_public, is_active, name, meeting_day, meeting_time,
  room_label, organization_id, ministry_id or delete
on public.sabbath_school_classes
for each row execute function private.sync_resa_sabbath_school_publication();

drop trigger if exists trg_resa_youth_activity_publication
  on public.youth_club_activities;
create trigger trg_resa_youth_activity_publication
after insert or update of is_public, status, title, description, starts_at, ends_at,
  location, organization_id or delete
on public.youth_club_activities
for each row execute function private.sync_resa_youth_activity_publication();

drop trigger if exists trg_resa_institutional_publication_organization
  on public.organizations;
create trigger trg_resa_institutional_publication_organization
after update of name, organization_type, is_active
on public.organizations
for each row execute function private.refresh_resa_institutional_publication_organization();

drop trigger if exists trg_resa_institutional_publication_ministry
  on public.ministries;
create trigger trg_resa_institutional_publication_ministry
after update of name
on public.ministries
for each row execute function private.refresh_resa_institutional_publication_ministry();

revoke all on function private.sync_resa_sabbath_school_publication() from public, anon, authenticated;
revoke all on function private.sync_resa_youth_activity_publication() from public, anon, authenticated;
revoke all on function private.refresh_resa_institutional_publication_organization() from public, anon, authenticated;
revoke all on function private.refresh_resa_institutional_publication_ministry() from public, anon, authenticated;

-- Backfill only records whose owners explicitly enabled public visibility.
insert into public.resa_institutional_publications (
  source_type, source_id, organization_id, organization_name, organization_type,
  ministry_id, ministry_name, title, body, meeting_day, meeting_time, room_label,
  is_active, published_at, updated_at
)
select
  'SABBATH_SCHOOL_CLASS', c.id, c.organization_id, o.name, o.organization_type,
  c.ministry_id, m.name, c.name, 'Classe da Escola Sabatina',
  c.meeting_day, c.meeting_time, c.room_label, o.is_active, c.created_at, now()
from public.sabbath_school_classes c
join public.organizations o on o.id = c.organization_id
left join public.ministries m on m.id = c.ministry_id and m.organization_id = c.organization_id
where c.is_public = true and c.is_active = true
on conflict (source_type, source_id) do nothing;

insert into public.resa_institutional_publications (
  source_type, source_id, organization_id, organization_name, organization_type,
  title, body, starts_at, ends_at, location, activity_type, status,
  is_active, published_at, updated_at
)
select
  'YOUTH_ACTIVITY', a.id, a.organization_id, o.name, o.organization_type,
  a.title, coalesce(a.description, ''), a.starts_at, a.ends_at, a.location,
  a.activity_type, a.status, o.is_active, a.created_at, now()
from public.youth_club_activities a
join public.organizations o on o.id = a.organization_id
where a.is_public = true and a.status <> 'CANCELLED'
on conflict (source_type, source_id) do nothing;

commit;
