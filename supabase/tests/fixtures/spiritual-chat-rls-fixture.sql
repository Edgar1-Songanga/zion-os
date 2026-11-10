create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (id uuid primary key);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

insert into auth.users (id) values
  ('51000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000002');

grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
