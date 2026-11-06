create role authenticated nologin;
create role anon nologin;
create schema private;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create table public.finance_journal_entries (
  id uuid primary key,
  status text not null check (status in ('DRAFT','POSTED','VOID'))
);
create table public.finance_journal_lines (
  id uuid primary key,
  journal_entry_id uuid not null references public.finance_journal_entries(id),
  account_id uuid not null,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0
);
grant select, insert, update on public.finance_journal_entries, public.finance_journal_lines to authenticated;
