\set ON_ERROR_STOP on

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$roles$;

create table public.giving_receipts (
  id bigint generated always as identity primary key,
  verification_code text not null unique
);

-- A previously issued receipt must remain unchanged by the new migration.
insert into public.giving_receipts (verification_code)
values ('LEGACY-RECEIPT-CODE');
