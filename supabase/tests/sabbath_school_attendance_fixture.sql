\set ON_ERROR_STOP on
create schema auth;
create schema private;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function private.has_org_permission(uuid,text) returns boolean language sql stable as $$ select false $$;
create table public.organizations(id uuid primary key);
create table public.ministries(id uuid primary key, organization_id uuid not null references public.organizations(id));
create table public.ministry_leaders(ministry_id uuid not null references public.ministries(id), user_id uuid not null references auth.users(id));
create table public.sabbath_school_classes(
 id uuid primary key, organization_id uuid not null references public.organizations(id),
 ministry_id uuid not null references public.ministries(id), is_active boolean not null default true,
 teacher_user_id uuid references auth.users(id)
);
create table public.church_member_records(
 id uuid primary key, organization_id uuid not null references public.organizations(id),
 membership_status text not null
);
create table public.sabbath_school_class_members(
 class_id uuid not null references public.sabbath_school_classes(id),
 organization_id uuid not null references public.organizations(id),
 member_record_id uuid not null references public.church_member_records(id),
 expires_at timestamptz not null
);
create table public.sabbath_school_attendance_sessions(
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.sabbath_school_classes(id),
 organization_id uuid not null references public.organizations(id), attendance_date date not null,
 lesson_reference text, recorded_by uuid references auth.users(id), recorded_at timestamptz not null default now(),
 expires_at timestamptz not null, unique(class_id,attendance_date)
);
create table public.sabbath_school_attendance(
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.sabbath_school_attendance_sessions(id),
 organization_id uuid not null references public.organizations(id), member_record_id uuid not null references public.church_member_records(id),
 attendance_status text not null check(attendance_status in ('PRESENT','ABSENT','EXCUSED')),
 recorded_at timestamptz not null default now(), expires_at timestamptz not null,
 unique(session_id,member_record_id)
);
create function private.set_test_expiry() returns trigger language plpgsql as $$ begin new.expires_at := now()+interval '90 days'; return new; end $$;
create trigger session_expiry before insert on public.sabbath_school_attendance_sessions for each row execute function private.set_test_expiry();
create trigger attendance_expiry before insert on public.sabbath_school_attendance for each row execute function private.set_test_expiry();
insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.organizations values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.ministries values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.sabbath_school_classes(id,organization_id,ministry_id,is_active,teacher_user_id)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,'11111111-1111-4111-8111-111111111111');
insert into public.church_member_records values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ACTIVE'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ACTIVE');
insert into public.sabbath_school_class_members values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',now()+interval '90 days'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',now()+interval '90 days');
grant usage on schema public,private,auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.has_org_permission(uuid,text) to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
